"use client";

import Image from "next/image";
import { useEffect, type MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRANDING } from "@/app/config/branding";
import {
    getAuthProviderMode,
    getOAuthRedirectPath,
    isEmulatorAuthProvider,
} from "@/lib/auth/provider";

export default function LoginPage() {
    const supabase = createClient();
    const emulatorAuthorizePath = "/api/auth/authorize?provider=azure&scopes=openid%20profile%20email";

    useEffect(() => {
        const handleHashTokens = async () => {
            const hash = window.location.hash;
            if (hash && hash.includes("access_token")) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");

                if (accessToken && refreshToken) {
                    try {
                        const serverSessionResponse = await fetch("/api/auth/session", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            credentials: "include",
                            body: JSON.stringify({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            }),
                        });

                        if (serverSessionResponse.ok) {
                            window.history.replaceState(null, "", "/login");
                            window.location.assign("/");
                            return;
                        }
                    } catch (e) {
                        console.error("LoginPage: /api/auth/session request failed", e);
                    }

                    // Fallback to browser-side setSession if server session endpoint is unavailable.
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (!error) {
                        window.history.replaceState(null, "", "/login");
                        window.location.assign("/");
                        return;
                    }
                    console.error("LoginPage: setSession error", error);
                }
            }
        };

        handleHashTokens();
        return () => undefined;
    }, [supabase.auth]);

    const handleLogin = (event: MouseEvent<HTMLAnchorElement>) => {
        const appOrigin = window.location.origin;

        try {
            const providerMode = getAuthProviderMode();

            if (!isEmulatorAuthProvider(providerMode)) {
                // Standard Supabase OAuth (for real Entra ID)
                event.preventDefault();
                supabase.auth.signInWithOAuth({
                    provider: "azure",
                    options: {
                        scopes: "openid profile email",
                        redirectTo: `${appOrigin}${getOAuthRedirectPath()}`,
                    },
                });
                return;
            }

            // Emulator: route through proxy to rewrite Docker-internal URLs
            const params = new URLSearchParams({
                provider: "azure",
                scopes: "openid profile email",
                redirect_to: `${appOrigin}${getOAuthRedirectPath()}`,
            });
            event.preventDefault();
            window.location.assign(`/api/auth/authorize?${params.toString()}`);
        } catch (error) {
            // Fallback keeps login working even if client-side env resolution fails.
            console.error("LoginPage: OAuth config error, using emulator authorize fallback", error);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
            {/* Logo with shine animation */}
            <div className="mb-8 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-background_alt flex items-center justify-center border border-border">
                    <Image
                        src={BRANDING.logoPath}
                        alt={BRANDING.appName}
                        width={48}
                        height={48}
                        className="w-12 h-12"
                    />
                </div>
                <h1 className="text-4xl font-heading font-bold text-primary shine">
                    {BRANDING.appName}
                </h1>
                <p className="text-secondary text-lg">Your AI Platform</p>
            </div>

            {/* Login card */}
            <div className="w-full max-w-md bg-background_alt rounded-xl border border-border p-8 shadow-lg">
                <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold text-primary mb-2">
                        Benvenuto
                    </h2>
                    <p className="text-secondary text-sm">
                        Accedi con il tuo account aziendale per continuare
                    </p>
                </div>

                {/* Microsoft login button */}
                <a
                    href={emulatorAuthorizePath}
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-[#0078D4] hover:bg-[#006cbd] text-white font-medium py-4 px-6 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                    <svg
                        className="w-6 h-6"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 21 21"
                    >
                        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                    Accedi con Microsoft
                </a>

                {/* Footer hint */}
                <p className="mt-6 text-center text-xs text-secondary">
                    Utilizzando questo servizio accetti i termini di utilizzo della
                    piattaforma.
                </p>
            </div>

            {/* Version/branding footer */}
            <div className="mt-8 text-xs text-secondary">
                Powered by Supabase &amp; Entra ID
            </div>
        </div>
    );
}
