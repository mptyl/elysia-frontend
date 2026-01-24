"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            console.log("AuthGuard: Checking auth state...");
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) console.error("AuthGuard: Error getting session", error);

                const user = session?.user;
                console.log("AuthGuard: User found:", !!user, "Path:", pathname);

                const isLoginPage = pathname === "/login";
                const isStaticAsset = pathname?.includes(".");

                if (!user && !isLoginPage && !isStaticAsset) {
                    console.log("AuthGuard: Redirecting to /login");
                    router.replace("/login");
                } else if (user && isLoginPage) {
                    console.log("AuthGuard: Redirecting to /");
                    router.replace("/");
                } else {
                    console.log("AuthGuard: Authorized to view content.");
                    setAuthorized(true);
                }
            } catch (err) {
                console.error("AuthGuard: Unexpected error", err);
                // In case of error, maybe allow render to avoid hard lock?
                // setAuthorized(true); 
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("AuthGuard: Auth state change:", event);
            if (event === "SIGNED_OUT") {
                setAuthorized(false);
                router.replace("/login");
            } else if (event === "SIGNED_IN") {
                const isLoginPage = pathname === "/login";
                if (isLoginPage) {
                    router.replace("/");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, pathname, supabase.auth]);

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
