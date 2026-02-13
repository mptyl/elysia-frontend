#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ATHENA_ROOT="$(cd "${PROJECT_ROOT}/.." && pwd)"

FRONTEND_ENV="${FRONTEND_ENV:-${PROJECT_ROOT}/.env.local}"
SUPABASE_ENV="${SUPABASE_ENV:-${ATHENA_ROOT}/supabase-project/.env}"
LDAP_ENV="${LDAP_ENV:-${ATHENA_ROOT}/ldap-emulator/.env}"
SUPABASE_COMPOSE="${SUPABASE_COMPOSE:-${ATHENA_ROOT}/supabase-project/docker-compose.yml}"

missing=0

require_key() {
  local file="$1"
  local key="$2"
  if ! grep -q "^${key}=" "${file}" 2>/dev/null; then
    echo "[ERROR] Missing key ${key} in ${file}"
    missing=1
  fi
}

read_value() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "${file}" | tail -n 1 | cut -d'=' -f2-
}

echo "Checking required keys..."
require_key "${FRONTEND_ENV}" "NEXT_PUBLIC_AUTH_PROVIDER"
require_key "${FRONTEND_ENV}" "AUTH_PROVIDER_MODE"
require_key "${FRONTEND_ENV}" "NEXT_PUBLIC_OAUTH_REDIRECT_PATH"
require_key "${FRONTEND_ENV}" "APP_PUBLIC_ORIGIN"
require_key "${FRONTEND_ENV}" "NEXT_PUBLIC_SUPABASE_URL"
require_key "${FRONTEND_ENV}" "SUPABASE_INTERNAL_URL"
require_key "${FRONTEND_ENV}" "NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME"

require_key "${SUPABASE_ENV}" "SITE_URL"
require_key "${SUPABASE_ENV}" "ADDITIONAL_REDIRECT_URLS"
require_key "${SUPABASE_ENV}" "GOTRUE_EXTERNAL_AZURE_URL"
require_key "${SUPABASE_ENV}" "GOTRUE_EXTERNAL_AZURE_REDIRECT_URI"
require_key "${SUPABASE_ENV}" "GOTRUE_MAILER_EXTERNAL_HOSTS"

require_key "${LDAP_ENV}" "ISSUER_URL"
require_key "${LDAP_ENV}" "ALLOW_DYNAMIC_REDIRECT_URI"

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

if ! grep -q 'GOTRUE_MAILER_EXTERNAL_HOSTS: ${GOTRUE_MAILER_EXTERNAL_HOSTS}' "${SUPABASE_COMPOSE}" 2>/dev/null; then
  echo "[ERROR] Supabase compose is missing GOTRUE_MAILER_EXTERNAL_HOSTS mapping."
  exit 1
fi

frontend_provider="$(read_value "${FRONTEND_ENV}" "NEXT_PUBLIC_AUTH_PROVIDER")"
server_provider="$(read_value "${FRONTEND_ENV}" "AUTH_PROVIDER_MODE")"
site_url="$(read_value "${SUPABASE_ENV}" "SITE_URL")"
callback_uri="$(read_value "${SUPABASE_ENV}" "GOTRUE_EXTERNAL_AZURE_REDIRECT_URI")"
oauth_redirect_path="$(read_value "${FRONTEND_ENV}" "NEXT_PUBLIC_OAUTH_REDIRECT_PATH")"
additional_redirects="$(read_value "${SUPABASE_ENV}" "ADDITIONAL_REDIRECT_URLS")"

echo "Checking coherence..."
if [[ "${frontend_provider}" != "${server_provider}" ]]; then
  echo "[ERROR] NEXT_PUBLIC_AUTH_PROVIDER and AUTH_PROVIDER_MODE do not match."
  exit 1
fi

if [[ "${oauth_redirect_path}" != /* ]]; then
  echo "[ERROR] NEXT_PUBLIC_OAUTH_REDIRECT_PATH must start with /."
  exit 1
fi

if [[ "${additional_redirects}" != *"${site_url}${oauth_redirect_path}"* ]]; then
  echo "[ERROR] ADDITIONAL_REDIRECT_URLS does not include canonical callback ${site_url}${oauth_redirect_path}."
  exit 1
fi

expected_callback_uri="${site_url}/supabase/auth/v1/callback"
if [[ "${callback_uri}" != "${expected_callback_uri}" ]]; then
  echo "[ERROR] GOTRUE_EXTERNAL_AZURE_REDIRECT_URI mismatch. Expected ${expected_callback_uri}, got ${callback_uri}."
  exit 1
fi

if [[ "${site_url}" == *"localhost"* ]]; then
  echo "[WARN] SITE_URL still points to localhost: ${site_url}"
fi

if [[ "${callback_uri}" == *"localhost"* ]]; then
  echo "[WARN] GOTRUE_EXTERNAL_AZURE_REDIRECT_URI still points to localhost: ${callback_uri}"
fi

echo "Configuration checks completed."
