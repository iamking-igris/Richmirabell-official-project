#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
if [ ! -f "$PROJECT_DIR/package.json" ] && [ -d "/home/king/Downloads/Richmirabel-frontend" ]; then
  PROJECT_DIR="/home/king/Downloads/Richmirabel-frontend"
fi

cd "$PROJECT_DIR"
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
