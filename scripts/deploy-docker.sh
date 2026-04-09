#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ARGS=()
if [[ -f .env ]]; then
  ARGS+=(--env-file .env)
fi

FILES=(docker-compose.yml)
if [[ "${ADMIN_USE_TRAEFIK:-0}" == "1" ]]; then
  FILES+=(docker-compose.traefik.yml)
fi

COMPOSE_ARGS=()
for f in "${FILES[@]}"; do
  COMPOSE_ARGS+=(-f "$f")
done

docker compose "${ARGS[@]}" "${COMPOSE_ARGS[@]}" up -d --build "$@"
