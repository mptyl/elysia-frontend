"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRANDING } from "@/app/config/branding";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // Check if already authenticated
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace("/");
            }
        });

        // Listen for auth state changes (e.g., after OAuth redirect)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                router.replace("/");
            }
        });

        return () => subscription.unsubscribe();
    }, [router, supabase.auth]);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "azure",
            options: {
                scopes: "openid profile email",
                redirectTo: "http://localhost:3090",
            },
        });
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
            {/* Logo with shine animation */}
            <div className="mb-8 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-background_alt flex items-center justify-center border border-border">
                    <img
                        src={BRANDING.logoPath}
                        alt={BRANDING.appName}
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
                <button
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
                </button>

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
