<div align="center">

<br />

```
 _   _       _         ____
| \ | | ___ | |_ ___  |  _ \  _____      ___ __
|  \| |/ _ \| __/ _ \ | | | |/ _ \ \/ / / '_ \
| |\  | (_) | ||  __/ | |_| | (_) \ V  V /| | | |
|_| \_|\___/ \__/\___| |____/ \___/ \_/\_/ |_| |_|
```

**A production-grade, AI-powered notes API for the modern multi-user web.**

<br />

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/gemini)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<br />

**Deploy targets:** Backend on Render, frontend on Vercel

<br />

</div>

---

## What is Note-Down?

Note-Down is a full-stack, multi-user notes service built with FastAPI and React. It includes JWT authentication, collaborative note sharing, version history, full-text search, and three AI-powered writing tools backed by Google Gemini Flash 2.5.

The frontend is a two-panel React app: note list on the left, live editor on the right, with AI actions docked at the bottom.

---

## Feature Overview

### Core
- **Auth** - register, login, logout, and silent token refresh via HttpOnly cookie
- **Notes CRUD** - create, read, update, soft-delete (trash, not destroy)
- **Listing** - `GET /notes` returns a plain array for spec compatibility
- **Paginated listing** - `GET /notes/paged?page=1&limit=20` returns the envelope with total count
- **Status filters** - active / archived / trashed, independently queryable
- **Pin notes** - pinned notes always float to the top regardless of sort order

### Sharing
- **Share with a user** - send a note to any registered email with `viewer` or `editor` role
- **Public links** - generate a token URL anyone can read without logging in
- **Revoke access** - per-user removal; public link can be toggled off instantly
- **View receipts** - see who last viewed a shared note and when

### Organisation
- **Tags** - coloured tags with full CRUD, scoped per user, multi-tag filtering
- **Version history** - every save snapshots the prior state; browse, diff, and restore any version
- **Duplicate** - clone any note with one call

### AI (Gemini Flash 2.5)
- **Summarise** - `POST /notes/{id}/summarise` returns a 2-3 sentence TL;DR
- **Suggest tags** - reads the note and returns up to 5 relevant tag suggestions
- **Continue writing** - extends your draft with a natural next paragraph

### Search
- **Full-text** - `GET /search?q=` backed by PostgreSQL `tsvector` GIN index
- **Semantic** - `GET /search?q=&mode=semantic` via Gemini embeddings

---

## Tech Stack

| Layer | Technology |
|---|---|
| **API framework** | FastAPI 0.115 (async) |
| **Language** | Python 3.12 |
| **ORM / migrations** | SQLAlchemy 2.x async + Alembic |
| **Database** | PostgreSQL 16 (prod) / SQLite (local dev) |
| **Auth** | JWT (python-jose) + bcrypt passlib |
| **AI** | Google Gemini Flash 2.5 (`google-generativeai`) |
| **Rate limiting** | slowapi |
| **Frontend** | React 18 + Vite + TailwindCSS |
| **State** | Zustand |
| **Containers** | Docker + docker-compose |
| **Backend deploy** | Render.com |
| **Frontend deploy** | Vercel |

---

## Getting Started

### Option 1 - Docker (recommended)

```bash
git clone https://github.com/ARYAN2302/Note-Down.git
cd Note-Down

export GEMINI_API_KEY=your-gemini-api-key-here
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://127.0.0.1:5173 |
| Backend API | http://127.0.0.1:8001 |
| Interactive docs | http://127.0.0.1:8001/docs |

### Option 2 - Local (backend only)

```bash
git clone https://github.com/ARYAN2302/Note-Down.git
cd Note-Down

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
# Edit backend/.env and fill in your values

cd backend
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

The API will be live at `http://localhost:8001`. Visit `/docs` for the interactive Swagger UI.

### Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/notesdb
SECRET_KEY=<generate with: python3 -c "import secrets; print(secrets.token_hex(32))">
GEMINI_API_KEY=<your Google AI Studio key>
ABOUT_NAME=<your name>
ABOUT_EMAIL=<your email>

# Optional
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Deployment variables

When deploying, override these with real production values:

- `ABOUT_NAME`
- `ABOUT_EMAIL`
- `SECRET_KEY`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `CORS_ORIGINS` to include your deployed Vercel URL
- Render's default PostgreSQL connection string is fine for `DATABASE_URL`; the backend normalizes it to the async driver automatically

---

## API Reference

All endpoints are prefixed with your base URL. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | - | Create a new account |
| `POST` | `/login` | - | Login, returns JWT + sets refresh cookie |
| `POST` | `/logout` | ✓ | Invalidate current token |
| `POST` | `/refresh` | cookie | Issue a new access token silently |

### Notes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/notes` | ✓ | List notes as a plain array |
| `GET` | `/notes/paged` | ✓ | List notes with pagination envelope |
| `GET` | `/notes/{id}` | ✓ | Get a single note |
| `POST` | `/notes` | ✓ | Create a note |
| `PUT` | `/notes/{id}` | ✓ | Update a note (auto-snapshots previous version) |
| `DELETE` | `/notes/{id}` | ✓ | Soft-delete to trash |
| `POST` | `/notes/{id}/duplicate` | ✓ | Clone a note |
| `POST` | `/notes/{id}/pin` | ✓ | Toggle pin |
| `POST` | `/notes/{id}/archive` | ✓ | Move to archive |
| `POST` | `/notes/{id}/restore` | ✓ | Restore from archive or trash |

### Sharing

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/notes/{id}/share` | ✓ | Share with email + role (`viewer`\|`editor`) |
| `GET` | `/notes/{id}/shares` | ✓ | List who has access |
| `DELETE` | `/notes/{id}/shares/{user_id}` | ✓ | Revoke one user's access |
| `POST` | `/notes/{id}/public-link` | ✓ | Generate public read-only link |
| `DELETE` | `/notes/{id}/public-link` | ✓ | Revoke public link |
| `GET` | `/shared/{token}` | - | View note via public token |

### Version History

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/notes/{id}/history` | ✓ | List all saved versions |
| `GET` | `/notes/{id}/history/{version}` | ✓ | Get full content of a version |
| `POST` | `/notes/{id}/restore/{version}` | ✓ | Roll back to a prior version |

### Tags

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/tags` | ✓ | List all user tags |
| `POST` | `/tags` | ✓ | Create a tag with name + hex colour |
| `PUT` | `/tags/{id}` | ✓ | Rename or recolour |
| `DELETE` | `/tags/{id}` | ✓ | Delete tag (removes from all notes) |
| `POST` | `/notes/{id}/tags` | ✓ | Apply tags to a note |
| `DELETE` | `/notes/{id}/tags/{tag_id}` | ✓ | Remove a tag from a note |

### AI

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/notes/{id}/summarise` | ✓ | Get a 2-3 sentence TL;DR |
| `POST` | `/notes/{id}/suggest-tags` | ✓ | Get up to 5 AI-suggested tags |
| `POST` | `/notes/{id}/continue` | ✓ | Generate a continuation paragraph |

### Search

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/search?q=keyword` | ✓ | Full-text search (PostgreSQL tsvector) |
| `GET` | `/search?q=keyword&mode=semantic` | ✓ | Semantic search via Gemini embeddings |

### Utility

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/about` | - | App info, author, feature list |
| `GET` | `/health` | - | Health check |
| `GET` | `/openapi.json` | - | OpenAPI 3.x spec |

---

## Project Structure

```
Note-Down/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── notes.py
│   │   │       ├── search.py
│   │   │       └── misc.py
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── hooks/
│   ├── Dockerfile
│   ├── vite.config.js
│   └── package.json
├── scripts/
├── docker-compose.yml
└── README.md
```

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Test coverage includes auth flows, notes CRUD, sharing and permissions, version history, and AI empty-content edge cases.

---

## Deployment

### Backend on Render

1. Create a PostgreSQL database on Render and copy the internal connection string.
2. Create a Web Service and point it at the `/backend` directory.
3. Set build command: `pip install -r requirements.txt && alembic upgrade head`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `ABOUT_NAME`, `ABOUT_EMAIL`, `CORS_ORIGINS`

### Frontend on Vercel

1. Import the `/frontend` directory into Vercel.
2. Set `VITE_API_BASE_URL=https://your-backend.onrender.com`
3. Deploy.
4. Copy the Vercel URL and add it to Render's `CORS_ORIGINS`.
5. Redeploy the backend.

---

## Security

- Passwords hashed with bcrypt (configurable cost factor, default 12)
- JWT tokens include a `jti` claim; logout blacklists the `jti` in the database
- Refresh tokens stored in `HttpOnly` cookies - not accessible to JavaScript
- Every authenticated route verifies token blacklist before processing
- Rate limiting on auth endpoints (5 attempts / 15 min per IP)
- `GET /notes/{id}` returns `404` for both non-existent and unauthorised notes - access can never be inferred
- CORS restricted to explicit origins; no wildcard in production
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

---

## Design Decisions

**Why soft delete?** Hard deletes are unrecoverable. Moving notes to trash gives users a window to recover mistakes, and it costs nothing - just a status column.

**Why version history on every save?** Data loss from accidental overwrites is a real and common problem. Snapshotting before every `PUT` is cheap and the value is high. Users should not have to think about it - it just works.

**Why PostgreSQL full-text search over Elasticsearch?** For this scale, `tsvector` with a GIN index is fast, zero-infrastructure, and free. Elasticsearch adds operational complexity that is not justified until query volumes or document sizes grow substantially.

**Why Gemini Flash 2.5?** It is fast, free-tier accessible, and more than capable for the three text tasks here (summarise, tag, continue). Keeping AI costs at zero matters for a submitted project.

**Why HttpOnly cookies for refresh tokens?** XSS attacks can exfiltrate tokens from `localStorage` or JavaScript-accessible memory. An `HttpOnly` cookie scoped to `/refresh` is invisible to scripts - the attacker gains nothing even if they can execute code in the page.

---

## Author

Built by **Aryan** as part of a backend engineering assignment.

---

<div align="center">

Made with FastAPI, PostgreSQL, React, and Gemini - ready for Render + Vercel deployment

</div>
