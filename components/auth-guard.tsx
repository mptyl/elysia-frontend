"use client";

import { createClient } from "@/lib/supabase/client";
import { isStaticMode } from "@/app/components/host";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const nextPathname = usePathname();

    // In static mode, usePathname() may not reflect the real URL.
    const loginPage = typeof window !== "undefined"
        ? window.location.pathname === "/login"
        : nextPathname === "/login";

    // Server mode: middleware already validated session, start authorized.
    // Static mode: no middleware, start unauthorized until session is confirmed.
    const [authorized, setAuthorized] = useState<boolean>(
        isStaticMode ? loginPage : !loginPage
    );

    useEffect(() => {
        // In server mode, trust middleware — mark non-login pages as authorized immediately.
        if (!isStaticMode && !loginPage) {
            setAuthorized(true);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("AuthGuard: Auth state change:", event, "session:", !!session);
            if (event === "SIGNED_OUT") {
                setAuthorized(false);
                if (isStaticMode) {
                    window.location.replace("/login");
                } else {
                    router.replace("/login");
                }
            } else if (
                event === "SIGNED_IN" ||
                event === "INITIAL_SESSION" ||
                event === "TOKEN_REFRESHED"
            ) {
                if (session) {
                    setAuthorized(true);
                    if (loginPage) {
                        if (isStaticMode) {
                            window.location.replace("/");
                        } else {
                            router.replace("/");
                        }
                    }
                } else if (event === "INITIAL_SESSION" && !loginPage && isStaticMode) {
                    // Static mode only: no middleware to protect routes,
                    // so redirect to login if there's no session.
                    // Skip if URL hash has access_token (Supabase is processing it).
                    const hash = typeof window !== "undefined" ? window.location.hash : "";
                    if (!hash.includes("access_token=")) {
                        setAuthorized(false);
                        window.location.replace("/login");
                    }
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, supabase.auth, loginPage]);

    // On login page, render children directly without app shell
    if (loginPage) {
        return <>{children}</>;
    }

    if (!authorized) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-primary gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p>Loading application...</p>
            </div>
        );
    }

    return <>{children}</>;
}
