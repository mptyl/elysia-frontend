import type { CookieOptionsWithName } from "@supabase/ssr";

const DEFAULT_AUTH_COOKIE_NAME = "sb-athena-auth-token";

export function getSupabaseAuthCookieName(): string {
    return (
        process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME ||
        process.env.SUPABASE_AUTH_COOKIE_NAME ||
        DEFAULT_AUTH_COOKIE_NAME
    );
}

export function getSupabaseCookieOptions(): CookieOptionsWithName {
    return {
        name: getSupabaseAuthCookieName(),
    };
}
