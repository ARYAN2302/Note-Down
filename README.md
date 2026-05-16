# Notes App

Multi-user notes app built with FastAPI, SQLAlchemy, Alembic, JWT auth, sharing, version history, search, and Gemini-powered AI helpers.

## Current status

Implemented through Phase 11 of the build plan:

- Backend foundation, models, migrations, auth, notes CRUD
- Sharing, public links, tags, version history
- Full-text and semantic search endpoints
- AI summarise, suggest-tags, continue-writing endpoints
- `/about`, `/health`, and OpenAPI exposure
- Backend pytest coverage for auth, notes, sharing, versioning, and AI empty-content handling
- Dockerized backend, frontend, and PostgreSQL compose setup

## Docker run

```bash
export GEMINI_API_KEY=your-gemini-api-key-here
docker compose up --build
```

Then open:

- Frontend: http://127.0.0.1:5173
- Backend: http://127.0.0.1:8001

## Local run

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```

## Notes

- The backend uses Gemini Flash 2.5 through `google.generativeai`.
- Docker compose includes PostgreSQL so the backend can run with its default `DATABASE_URL`.
- The root `Dockerfile`s build production images for both services.
- Before deploying on Render, set real values for `ABOUT_NAME`, `ABOUT_EMAIL`, `SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`, and a production `CORS_ORIGINS` that includes the deployed frontend URL.
- The `/notes` route now returns a plain array for spec compatibility; paginated results remain available at `/notes/paged`.
