#!/usr/bin/env bash
set -euo pipefail

ELYSIA_DIR="/opt/athena/elysia"
ELYSIA_PORT="8090"
ELYSIA_LOG="/tmp/elysia-backend.log"

echo "Restarting ldap-emulator..."
docker compose -f /opt/athena/ldap-emulator/docker-compose.yml up -d entra-emulator

echo "Restarting Supabase auth gateway..."
docker compose -f /opt/athena/supabase-project/docker-compose.yml up -d auth kong

echo "Restarting Elysia backend on port ${ELYSIA_PORT} (reload disabled)..."
if pids=$(ps -ef | awk '/[.]venv\/bin\/elysia start --host 0.0.0.0 --port 8090/ {print $2}'); then
  if [[ -n "${pids}" ]]; then
    kill -9 ${pids} || true
  fi
fi

(
  cd "${ELYSIA_DIR}"
  nohup ./.venv/bin/elysia start --host 0.0.0.0 --port "${ELYSIA_PORT}" --reload false >"${ELYSIA_LOG}" 2>&1 &
)

backend_ready=0
for _ in $(seq 1 20); do
  if ss -ltnp | grep -q ":${ELYSIA_PORT}"; then
    backend_ready=1
    break
  fi
  sleep 1
done

if [[ "${backend_ready}" -ne 1 ]]; then
  echo "[ERROR] Elysia backend did not start on port ${ELYSIA_PORT}."
  echo "Recent backend log:"
  tail -n 80 "${ELYSIA_LOG}" || true
  exit 1
fi

echo "Elysia backend restarted successfully."
echo "Backend log: ${ELYSIA_LOG}"

echo "Restarting frontend is manual (to avoid killing active dev sessions)."
echo "Run from /opt/athena/elysia-frontend:"
echo "  npm run dev:server"
