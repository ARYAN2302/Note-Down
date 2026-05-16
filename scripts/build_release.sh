#!/usr/bin/env bash
set -euo pipefail

# Build a production release in ./release
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE="$ROOT/release"
cd "$ROOT"
rm -rf "$RELEASE"
mkdir -p "$RELEASE"

echo "Building frontend (Vite)..."
cd frontend
npm run build
cd "$ROOT"

echo "Copying frontend build to release..."
mkdir -p "$RELEASE/frontend"
cp -a frontend/dist "$RELEASE/frontend/dist"

echo "Copying minimal backend to release..."
mkdir -p "$RELEASE/backend"
# copy requirements and source
cp -a backend/requirements.txt backend/.env.example "$RELEASE/backend/" 2>/dev/null || true
rsync -a --prune-empty-dirs --exclude 'tests' --exclude 'alembic/versions' backend/app "$RELEASE/backend/"

echo "Adding Dockerfiles and docker-compose..."
cp -a scripts/Dockerfile.backend "$RELEASE/backend/Dockerfile"
cp -a scripts/Dockerfile.frontend "$RELEASE/frontend/Dockerfile"
cp -a scripts/docker-compose.release.yml "$RELEASE/docker-compose.yml"

echo "Removing optional assets from release (tests, migrations)..."
rm -rf "$RELEASE/backend/app/tests" || true
rm -rf "$RELEASE/backend/alembic/versions" || true

echo "Creating release tarball..."
cd "$RELEASE/.."
tar -czf "notes-app-release.tar.gz" "$(basename "$RELEASE")"
cd "$ROOT"

echo "Release assembled at: $RELEASE"
echo "Tarball: $ROOT/notes-app-release.tar.gz"
