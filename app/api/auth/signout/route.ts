import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";

// Patched by scripts/set-route-dynamic.js before each build:
// "force-static" for static export, "force-dynamic" for server mode.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
        process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookieOptions: getSupabaseCookieOptions(),
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
        return NextResponse.json(
            { error: error.message || "Unable to sign out" },
            { status: 400 }
        );
    }

    return response;
}
