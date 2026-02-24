import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";
import { fetchDirectoryUser } from "@/lib/directory/client";
import { getGraphAccessToken } from "@/lib/directory/graph-token";

// Patched by scripts/set-route-dynamic.js before each build:
// "force-static" for static export, "force-dynamic" for server mode.
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/sync-profile
 *
 * Called after authentication to sync jobTitle and department
 * from the directory service into the Supabase user_profiles table.
 *
 * Resilient: if the directory service is unreachable, logs a warning
 * and returns 200 so the user can still use the app.
 */
export async function POST(request: NextRequest) {
    try {
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
                            response.cookies.set(name, value, options),
                        );
                    },
                },
            },
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            return NextResponse.json({ ok: true, reason: "no user/email" });
        }

        const graphToken = await getGraphAccessToken();
        const dirUser = await fetchDirectoryUser(user.email, graphToken ?? undefined);

        if (!dirUser) {
            console.warn("[sync-profile] Directory service returned no data for", user.email);
            return NextResponse.json({ ok: true, reason: "directory_unavailable" });
        }

        const { error } = await supabase.from("user_profiles").upsert(
            {
                id: user.id,
                job_title: dirUser.jobTitle,
                department: dirUser.department,
            },
            { onConflict: "id", ignoreDuplicates: false },
        );

        if (error) {
            console.error("[sync-profile] Supabase upsert error:", error);
        }

        return response;
    } catch (err) {
        console.error("[sync-profile] Unexpected error:", err);
        return NextResponse.json({ ok: true, reason: "error" });
    }
}
