"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const [isLoginPage, setIsLoginPage] = useState(false);

    useEffect(() => {
        const loginPage = pathname === "/login";
        setIsLoginPage(loginPage);

        const checkAuth = async () => {
            console.log("AuthGuard: Checking auth state...");

            // Bypass auth if disabled
            if (process.env.NEXT_PUBLIC_AUTH_ENABLED === "false") {
                console.log("AuthGuard: Auth disabled, bypassing checks.");
                if (loginPage) {
                    router.replace("/");
                } else {
                    setAuthorized(true);
                }
                return;
            }

            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) console.error("AuthGuard: Error getting session", error);

                const user = session?.user;
                console.log("AuthGuard: User found:", !!user, "Path:", pathname);

                const isStaticAsset = pathname?.includes(".");

                if (!user && !loginPage && !isStaticAsset) {
                    console.log("AuthGuard: Redirecting to /login");
                    router.replace("/login");
                } else if (user && loginPage) {
                    console.log("AuthGuard: Redirecting to /");
                    router.replace("/");
                } else {
                    console.log("AuthGuard: Authorized to view content.");
                    setAuthorized(true);
                }
            } catch (err) {
                console.error("AuthGuard: Unexpected error", err);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("AuthGuard: Auth state change:", event);
            if (event === "SIGNED_OUT") {
                setAuthorized(false);
                router.replace("/login");
            } else if (event === "SIGNED_IN") {
                if (loginPage) {
                    router.replace("/");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, pathname, supabase.auth]);

    // On login page, render children directly without app shell
    // This gives the login page a clean, standalone appearance
    if (isLoginPage) {
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

