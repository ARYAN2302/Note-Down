#!/usr/bin/env bash
set -euo pipefail

# Creates a slimmed copy of the repository under ./slim
# Strategy: copy runtime source and manifests, then strip comments and blank lines
# - Keeps backend/app, frontend/src, requirements/package manifests, alembic
# - Excludes .venv, node_modules, frontend/dist, package-lock.json

ROOT="$(pwd)"
SLIM="$ROOT/slim"
rm -rf "$SLIM"
mkdir -p "$SLIM"

# Copy required folders
rsync -a --prune-empty-dirs \
  --exclude '.venv' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'package-lock.json' \
  backend/app "$SLIM/backend/"
rsync -a --prune-empty-dirs frontend/src "$SLIM/frontend/"

# Copy manifests
mkdir -p "$SLIM/backend"
cp -a backend/requirements.txt backend/alembic.ini backend/.env.example "$SLIM/backend/" 2>/dev/null || true
cp -a frontend/package.json frontend/index.html "$SLIM/frontend/" 2>/dev/null || true
cp -a README.md "$SLIM/" 2>/dev/null || true

# Function to strip comments/blank lines for various filetypes
strip_file() {
  src="$1"
  dst="$2"
  mkdir -p "$(dirname "$dst")"
  case "${src##*.}" in
    py)
      # remove full-line comments and trailing whitespace, keep docstrings
      sed -E '/^[[:space:]]*#/d; s/[[:space:]]+$//' "$src" > "$dst"
      ;;
    js|jsx|ts|tsx)
      # remove /* */ block comments and // line comments, then remove empty lines
      perl -0777 -pe 's{/\*.*?\*/}{}gs; s{//.*$}{}mg; ' "$src" | sed '/^[[:space:]]*$/d' > "$dst"
      ;;
    css|html|json|md)
      # For css/html remove /* */ comments; json/md: keep as-is but strip blank lines
      if [[ "${src##*.}" == "css" || "${src##*.}" == "html" ]]; then
        perl -0777 -pe 's{/\*.*?\*/}{}gs; ' "$src" | sed '/^[[:space:]]*$/d' > "$dst"
      else
        sed '/^[[:space:]]*$/d' "$src" > "$dst"
      fi
      ;;
    *)
      cp -a "$src" "$dst"
      ;;
  esac
}

# Walk copied slim tree and rewrite files in place to stripped versions
find "$SLIM" -type f \( -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.html" -o -name "*.json" -o -name "*.md" \) -print0 | while IFS= read -r -d '' f; do
  tmp="${f}.tmp"
  strip_file "$f" "$tmp"
  mv "$tmp" "$f"
done

# Provide summary
echo "Slim copy created at: $SLIM"
echo "Sizes (du -sh):"
du -sh "$SLIM" || true

echo "Line counts (wc -l):"
find "$SLIM" -type f \( -name '*.py' -o -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.md' \) -print0 | xargs -0 wc -l | sort -n || true
