import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";

interface SessionPayload {
    access_token?: string;
    refresh_token?: string;
}

export async function POST(request: NextRequest) {
    let payload: SessionPayload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;

    if (!accessToken || !refreshToken) {
        return NextResponse.json(
            { error: "access_token and refresh_token are required" },
            { status: 400 }
        );
    }

    let response = NextResponse.json({ ok: true });

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
                    response = NextResponse.json({ ok: true });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    if (error) {
        return NextResponse.json(
            { error: error.message || "Unable to set server auth session" },
            { status: 400 }
        );
    }

    return response;
}
