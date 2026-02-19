#!/bin/bash
# Verify that environment configuration is consistent across components.
# Run from the AthenaAI root directory.

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
fi
echo

# Check Supabase
echo "Supabase (.env):"
if [ -f "supabase-project/.env" ]; then
    SITE_URL=$(grep "^SITE_URL=" supabase-project/.env | cut -d= -f2)
    REDIRECT_URI=$(grep "^GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=" supabase-project/.env | cut -d= -f2)
    AZURE_URL=$(grep "^GOTRUE_EXTERNAL_AZURE_URL=" supabase-project/.env | cut -d= -f2)
    echo "  SITE_URL: $SITE_URL"
    echo "  GOTRUE_EXTERNAL_AZURE_REDIRECT_URI: $REDIRECT_URI"
    echo "  GOTRUE_EXTERNAL_AZURE_URL: $AZURE_URL"

    # Verify origins match
    if [ "$APP_ORIGIN" == "$SITE_URL" ]; then
        echo "  ✓ NEXT_PUBLIC_APP_ORIGIN and SITE_URL match"
    else
        echo "  ✗ ERROR: NEXT_PUBLIC_APP_ORIGIN ($APP_ORIGIN) != SITE_URL ($SITE_URL)"
    fi

    # Verify redirect URI starts with SITE_URL
    if [[ "$REDIRECT_URI" == "$SITE_URL"* ]]; then
        echo "  ✓ GOTRUE_EXTERNAL_AZURE_REDIRECT_URI starts with SITE_URL"
    else
        echo "  ✗ ERROR: REDIRECT_URI ($REDIRECT_URI) does not start with SITE_URL ($SITE_URL)"
    fi
else
    echo "  ERROR: .env not found"
fi
echo

# Check emulator (if applicable)
if [ "$AUTH_PROVIDER" == "emulator" ]; then
    echo "LDAP Emulator:"
    # Try common locations for the emulator .env
    LDAP_ENV=""
    for candidate in \
        "../ldap/.env" \
        "../sandbox/ldap/.env" \
        "/Users/mp/projects/sandbox/ldap/.env" \
        "/opt/athena/ldap-emulator/.env"; do
        if [ -f "$candidate" ]; then
            LDAP_ENV="$candidate"
            break
        fi
    done

    if [ -n "$LDAP_ENV" ]; then
        DEFAULT_REDIRECT=$(grep "^DEFAULT_APP_REDIRECT_URIS=" "$LDAP_ENV" | cut -d= -f2)
        echo "  File: $LDAP_ENV"
        echo "  DEFAULT_APP_REDIRECT_URIS: $DEFAULT_REDIRECT"

        if [[ "$DEFAULT_REDIRECT" == "$SITE_URL"* ]]; then
            echo "  ✓ Emulator redirect URI matches SITE_URL"
        else
            echo "  ✗ WARNING: Emulator redirect URI ($DEFAULT_REDIRECT) does not match SITE_URL ($SITE_URL)"
        fi
    else
        echo "  WARNING: LDAP emulator .env not found at common locations"
    fi
fi
echo

echo "=== Verification Complete ==="
