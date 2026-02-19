#!/bin/bash

# This script should be run from the project root directory

echo "=== Environment Configuration Verification ==="
echo

# Check frontend
echo "Frontend (.env.local):"
if [ -f "elysia-frontend/.env.local" ]; then
    APP_ORIGIN=$(grep "^NEXT_PUBLIC_APP_ORIGIN=" elysia-frontend/.env.local | cut -d= -f2)
    AUTH_PROVIDER=$(grep "^NEXT_PUBLIC_AUTH_PROVIDER=" elysia-frontend/.env.local | cut -d= -f2)
    echo "  NEXT_PUBLIC_APP_ORIGIN: $APP_ORIGIN"
    echo "  NEXT_PUBLIC_AUTH_PROVIDER: $AUTH_PROVIDER"
else
    echo "  ERROR: .env.local not found"
    echo "  (Run this script from the project root directory)"
fi
echo

# Check Supabase
echo "Supabase (.env):"
if [ -f "supabase-project/.env" ]; then
    SITE_URL=$(grep "^SITE_URL=" supabase-project/.env | cut -d= -f2)
    REDIRECT_URI=$(grep "^GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=" supabase-project/.env | cut -d= -f2)
    echo "  SITE_URL: $SITE_URL"
    echo "  GOTRUE_EXTERNAL_AZURE_REDIRECT_URI: $REDIRECT_URI"

    # Verify match
    if [ -n "$APP_ORIGIN" ] && [ "$APP_ORIGIN" == "$SITE_URL" ]; then
        echo "  ✓ Origins match"
    elif [ -n "$APP_ORIGIN" ]; then
        echo "  ✗ ERROR: Origins don't match!"
    fi
else
    echo "  ERROR: .env not found"
    echo "  (Run this script from the project root directory)"
fi
echo

# Check emulator (if needed)
if [ "$AUTH_PROVIDER" == "emulator" ]; then
    echo "LDAP Emulator (.env):"
    if [ -f "sandbox/ldap/.env" ]; then
        DEFAULT_REDIRECT=$(grep "^DEFAULT_APP_REDIRECT_URIS=" sandbox/ldap/.env | cut -d= -f2)
        echo "  DEFAULT_APP_REDIRECT_URIS: $DEFAULT_REDIRECT"
    else
        echo "  WARNING: .env not found (needed for emulator mode)"
    fi
fi
