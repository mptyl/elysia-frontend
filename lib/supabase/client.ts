import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";

function getSupabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (url.startsWith("/")) {
        // Browser: resolve relative path against the current origin
        if (typeof window !== "undefined") {
            return `${window.location.origin}${url}`;
        }
        // SSR: use the internal server URL
        return process.env.SUPABASE_INTERNAL_URL || "http://127.0.0.1:8000";
    }
    return url;
}

export function createClient() {
    return createBrowserClient(
        getSupabaseUrl(),
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookieOptions: getSupabaseCookieOptions(),
        }
    );
}
