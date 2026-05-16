# Notes App

Backend for a multi-user notes service built with FastAPI, SQLAlchemy, Alembic, JWT auth, sharing, version history, search, and Gemini-powered AI helpers.

## Current status

Implemented through Phase 9 of the build plan:

- Backend foundation, models, migrations, auth, notes CRUD
- Sharing, public links, tags, version history
- Full-text and semantic search endpoints
- AI summarise, suggest-tags, continue-writing endpoints
- `/about`, `/health`, and OpenAPI exposure
- Backend pytest coverage for auth, notes, sharing, versioning, and AI empty-content handling

## Local backend run

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```
