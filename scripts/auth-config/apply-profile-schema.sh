#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SQL_FILE="${ROOT_DIR}/scripts/auth-config/profile-schema.sql"

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "[ERROR] Missing SQL file: ${SQL_FILE}" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^supabase-db$'; then
  echo "[ERROR] Container supabase-db is not running." >&2
  exit 1
fi

echo "Applying profile schema to supabase-db..."
docker exec -i supabase-db psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "${SQL_FILE}"
echo "Schema applied successfully."
