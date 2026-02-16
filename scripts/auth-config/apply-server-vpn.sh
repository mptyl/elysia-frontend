#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"

FRONTEND_SRC="${ROOT_DIR}/config/env/.env.frontend.server-vpn"
FRONTEND_DST="${ROOT_DIR}/.env.local"

SUPABASE_OVERLAY="${ROOT_DIR}/config/env/.env.supabase.server-vpn"
SUPABASE_DST="/opt/athena/supabase-project/.env"
SUPABASE_COMPOSE="/opt/athena/supabase-project/docker-compose.yml"

LDAP_OVERLAY="${ROOT_DIR}/config/env/.env.ldap.server-vpn"
LDAP_DST="/opt/athena/ldap-emulator/.env"

backup_if_exists() {
  local file="$1"
  if [[ -f "${file}" ]]; then
    cp "${file}" "${file}.bak.${STAMP}"
  fi
}

upsert_env_key() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped_value
  escaped_value="$(printf "%s" "${value}" | sed -e 's/[&|]/\\&/g')"

  if grep -q "^${key}=" "${file}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "${file}"
  else
    echo "${key}=${value}" >> "${file}"
  fi
}

apply_overlay() {
  local overlay="$1"
  local target="$2"

  if [[ ! -f "${overlay}" ]]; then
    echo "Overlay file not found: ${overlay}" >&2
    exit 1
  fi

  touch "${target}"

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" ]] && continue
    [[ "${line}" =~ ^[[:space:]]*# ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"
    upsert_env_key "${target}" "${key}" "${value}"
  done < "${overlay}"
}

echo "Applying frontend server profile..."
backup_if_exists "${FRONTEND_DST}"
cp "${FRONTEND_SRC}" "${FRONTEND_DST}"

echo "Applying Supabase server overlay..."
backup_if_exists "${SUPABASE_DST}"
apply_overlay "${SUPABASE_OVERLAY}" "${SUPABASE_DST}"

# Keep docker-compose env wiring fully config-driven.
if grep -q 'GOTRUE_EXTERNAL_AZURE_REDIRECT_URI: http://localhost:8000/auth/v1/callback' "${SUPABASE_COMPOSE}" 2>/dev/null; then
  sed -i 's#GOTRUE_EXTERNAL_AZURE_REDIRECT_URI: http://localhost:8000/auth/v1/callback#GOTRUE_EXTERNAL_AZURE_REDIRECT_URI: ${GOTRUE_EXTERNAL_AZURE_REDIRECT_URI}#' "${SUPABASE_COMPOSE}"
fi
if ! grep -q 'GOTRUE_MAILER_EXTERNAL_HOSTS: ${GOTRUE_MAILER_EXTERNAL_HOSTS}' "${SUPABASE_COMPOSE}" 2>/dev/null; then
  sed -i '/GOTRUE_SITE_URL: ${SITE_URL}/a\      GOTRUE_MAILER_EXTERNAL_HOSTS: ${GOTRUE_MAILER_EXTERNAL_HOSTS}' "${SUPABASE_COMPOSE}"
fi

echo "Applying ldap-emulator server profile..."
backup_if_exists "${LDAP_DST}"
cp "${LDAP_OVERLAY}" "${LDAP_DST}"

echo "Done."
echo "Backups were saved with suffix .bak.${STAMP}"
