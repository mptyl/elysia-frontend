"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * /auth/callback
 *
 * Client-side OAuth callback page. Handles both authentication flows:
 *
 * - PKCE flow: code arrives in query params (?code=...). Exchanged via
 *   the Supabase browser client's exchangeCodeForSession().
 * - Implicit flow: tokens arrive in the URL hash fragment (#access_token=...).
 *   Posted to /api/auth/session to set server cookies, with a client-side
 *   setSession() fallback.
 *
 * In static-export mode (served by FastAPI), the backend's own /auth/callback
 * route handles the callback before this page is ever reached.
 */
const supabase = createClient();

export default function AuthCallbackPage() {
    const [status, setStatus] = useState("Processing authentication...");

    useEffect(() => {
        const handleCallback = async () => {
            const hash = window.location.hash || "";
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get("code");
            const error = searchParams.get("error");
            const errorDescription = searchParams.get("error_description");

            // --- Error from provider ---
            if (error) {
                const loginUrl = new URL("/login", window.location.origin);
                loginUrl.searchParams.set("error", error);
                if (errorDescription) {
                    loginUrl.searchParams.set("error_description", errorDescription);
                }
                window.location.replace(loginUrl.toString());
                return;
            }

            // --- PKCE flow: code in query params ---
            if (code) {
                try {
                    const { error: exchangeError } =
                        await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error("[Callback] Code exchange error:", exchangeError);
                        setStatus("Authentication failed. Redirecting...");
                        window.location.replace("/login");
                        return;
                    }

                    // Sync profile (fire-and-forget)
                    fetch("/api/auth/sync-profile", {
                        method: "POST",
                        credentials: "include",
                    }).catch((err) =>
                        console.error("[Callback] sync-profile failed:", err),
                    );

                    window.location.replace("/");
                } catch (err) {
                    console.error("[Callback] Unexpected error during code exchange:", err);
                    window.location.replace("/login");
                }
                return;
            }

            // --- Implicit flow: tokens in hash fragment ---
            if (hash && hash.includes("access_token=")) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");

                if (accessToken && refreshToken) {
                    // Set session in the browser client first — this ensures the
                    // createBrowserClient (used by AuthGuard) has the session in its
                    // cookie storage before we navigate away.
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (setSessionError) {
                        console.error("[Callback] setSession error:", setSessionError);
                        // fall through to the invalid-tokens redirect below
                    } else {
                        // Also set server-side session (fire-and-forget, for SSR routes)
                        fetch("/api/auth/session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            }),
                        }).catch((err) =>
                            console.error("[Callback] /api/auth/session failed:", err),
                        );

                        fetch("/api/auth/sync-profile", {
                            method: "POST",
                            credentials: "include",
                        }).catch((err) =>
                            console.error("[Callback] sync-profile failed:", err),
                        );

                        window.history.replaceState(null, "", "/auth/callback");
                        window.location.replace("/");
                        return;
                    }
                }

                // Invalid or missing tokens
                window.location.replace("/login" + hash);
                return;
            }

            // --- No code, no tokens ---
            if (hash) {
                window.location.replace("/login" + hash);
                return;
            }

            const search = window.location.search || "";
            if (search) {
                window.location.replace("/login" + search);
                return;
            }

            window.location.replace("/");
        };

        handleCallback();
    }, [supabase.auth]);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-primary gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p>{status}</p>
        </div>
    );
}
