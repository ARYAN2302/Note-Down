import asyncio
import json
from math import sqrt

import google.generativeai as genai
from fastapi import HTTPException

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

SUMMARISE_PROMPT = """You are a concise note summariser.
Summarise the following note in 2-3 sentences. Return only the summary, no preamble.

Title: {title}
Content: {content}"""

SUGGEST_TAGS_PROMPT = """You are a tagging assistant.
Read this note and suggest up to 5 short, relevant tags (1-3 words each).
Return ONLY a JSON array of strings, no other text. Example: ["meeting", "project alpha", "todo"]

Title: {title}
Content: {content}"""

CONTINUE_WRITING_PROMPT = """You are a writing assistant.
Continue the following note naturally, writing one paragraph (3-5 sentences) in the same tone and style.
Return only the continuation text, no preamble.

Title: {title}
Content: {content}"""


def _truncate_content(content: str) -> str:
    return content[:8000]


async def _generate_text(prompt: str) -> str:
    try:
        response = await asyncio.wait_for(model.generate_content_async(prompt), timeout=30)
        return (response.text or "").strip()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI service failed") from exc


async def summarise_note(title: str, content: str) -> str:
    prompt = SUMMARISE_PROMPT.format(title=title, content=_truncate_content(content))
    return await _generate_text(prompt)


async def suggest_tags(title: str, content: str) -> list[str]:
    prompt = SUGGEST_TAGS_PROMPT.format(title=title, content=_truncate_content(content))
    text = await _generate_text(prompt)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed[:5] if str(item).strip()]
    except json.JSONDecodeError:
        return []
    return []


async def continue_note(title: str, content: str) -> str:
    prompt = CONTINUE_WRITING_PROMPT.format(title=title, content=_truncate_content(content))
    return await _generate_text(prompt)


def _dot(vec1: list[float], vec2: list[float]) -> float:
    return sum(a * b for a, b in zip(vec1, vec2))


def _norm(vec: list[float]) -> float:
    return sqrt(sum(v * v for v in vec))


async def semantic_scores(query: str, documents: list[str]) -> list[float]:
    try:
        query_embedding = await asyncio.to_thread(
            genai.embed_content, model="models/text-embedding-004", content=query, task_type="retrieval_query"
        )
        doc_embeddings = await asyncio.to_thread(
            genai.embed_content, model="models/text-embedding-004", content=documents, task_type="retrieval_document"
        )
        q_vec = query_embedding["embedding"]
        doc_vecs = doc_embeddings["embedding"]
        scores = []
        q_norm = _norm(q_vec) or 1.0
        for vec in doc_vecs:
            denom = q_norm * (_norm(vec) or 1.0)
            scores.append(_dot(q_vec, vec) / denom if denom else 0.0)
        return scores
    except Exception:
        return [0.0 for _ in documents]
