import { NextRequest, NextResponse } from "next/server";
import {
    getAuthProviderMode,
    getOAuthRedirectPath,
} from "@/lib/auth/provider";

/**
 * Proxies the Supabase OAuth authorize call (emulator mode only).
 * Intercepts the 302 to the Entra emulator (Docker-internal host)
 * and rewrites it to use the /entra proxy path accessible from the browser.
 */

function getRequestOrigin(request: NextRequest): string {
    const forwardedHostRaw = request.headers.get("x-forwarded-host");
    const forwardedProtoRaw = request.headers.get("x-forwarded-proto");
    const hostRaw = request.headers.get("host");

    const forwardedHost = forwardedHostRaw?.split(",")[0]?.trim();
    const forwardedProto = forwardedProtoRaw?.split(",")[0]?.trim();
    const host = forwardedHost || hostRaw || request.nextUrl.host;
    const proto = forwardedProto || request.nextUrl.protocol.replace(":", "");

    return `${proto}://${host}`;
}

function parseBaseUrl(rawValue: string, origin: string): URL {
    if (rawValue.startsWith("/")) {
        return new URL(rawValue, origin);
    }
    return new URL(rawValue);
}

export async function GET(request: NextRequest) {
    if (getAuthProviderMode() !== "emulator") {
        return NextResponse.json(
            {
                error:
                    "/api/auth/authorize can be used only when NEXT_PUBLIC_AUTH_PROVIDER=emulator",
            },
            { status: 400 }
        );
    }

    const origin = getRequestOrigin(request);
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    searchParams.set("redirect_to", `${origin}${getOAuthRedirectPath()}`);

    const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || "http://127.0.0.1:8000";
    const targetUrl = `${supabaseUrl}/auth/v1/authorize?${searchParams.toString()}`;

    const response = await fetch(targetUrl, { redirect: "manual" });

    const location = response.headers.get("location");
    if (!location) {
        return NextResponse.json({ error: "No redirect from Supabase" }, { status: 502 });
    }

    try {
        const locationUrl = new URL(location, supabaseUrl);
        const emulatorInternal = new URL(
            process.env.ENTRA_EMULATOR_INTERNAL_HOST || "http://host.docker.internal:8029"
        );
        const emulatorPublicBase = parseBaseUrl(
            process.env.NEXT_PUBLIC_ENTRA_EMULATOR_PUBLIC_BASE || "/entra",
            origin
        );

        if (locationUrl.origin === emulatorInternal.origin) {
            const basePath = emulatorPublicBase.pathname.replace(/\/$/, "");
            const targetPath = locationUrl.pathname.startsWith("/")
                ? locationUrl.pathname
                : `/${locationUrl.pathname}`;

            locationUrl.protocol = emulatorPublicBase.protocol;
            locationUrl.host = emulatorPublicBase.host;
            locationUrl.pathname = `${basePath}${targetPath}`;
        }

        // Keep callback pinned to the same origin used by the browser request.
        locationUrl.searchParams.set(
            "redirect_uri",
            `${origin}/supabase/auth/v1/callback`
        );

        const redirectResponse = NextResponse.redirect(
            locationUrl.toString(),
            response.status === 301 ? 301 : 302
        );
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
            redirectResponse.headers.set("set-cookie", setCookie);
        }
        return redirectResponse;
    } catch (e) {
        console.error("[Authorize] Error parsing upstream location URL:", e);
        return NextResponse.json(
            { error: "Invalid redirect URL from Supabase authorize endpoint" },
            { status: 502 }
        );
    }
}
