"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const loginPage = pathname === "/login";
    const [authorized, setAuthorized] = useState<boolean>(!loginPage);

    useEffect(() => {
        // Middleware is the source of truth for protected route access.
        // Client-side auth state can lag behind right after OAuth callback.
        if (!loginPage) {
            setAuthorized(true);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            console.log("AuthGuard: Auth state change:", event);
            if (event === "SIGNED_OUT") {
                setAuthorized(false);
                router.replace("/login");
            } else if (
                event === "SIGNED_IN" ||
                event === "INITIAL_SESSION" ||
                event === "TOKEN_REFRESHED"
            ) {
                setAuthorized(true);
                if (loginPage) {
                    router.replace("/");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, supabase.auth, loginPage]);

    // On login page, render children directly without app shell
    // This gives the login page a clean, standalone appearance
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
