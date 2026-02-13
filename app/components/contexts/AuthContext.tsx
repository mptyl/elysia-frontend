"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
    getAuthProviderMode,
    getOAuthRedirectPath,
    isEmulatorAuthProvider,
} from "@/lib/auth/provider";

interface AuthContextType {
    session: Session | null;
    loading: boolean;
    signInWithMicrosoft: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    signInWithMicrosoft: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                setSession(session);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const signInWithMicrosoft = async () => {
        const providerMode = getAuthProviderMode();
        const appOrigin = window.location.origin;

        if (!isEmulatorAuthProvider(providerMode)) {
            // Standard flow — Supabase handles redirect to real Entra ID
            await supabase.auth.signInWithOAuth({
                provider: "azure",
                options: {
                    scopes: "openid profile email",
                    redirectTo: `${appOrigin}${getOAuthRedirectPath()}`,
                },
            });
            return;
        }

        // Emulator flow uses our authorize proxy so callback and redirect URI are host-aware.
        const params = new URLSearchParams({
            provider: "azure",
            scopes: "openid profile email",
            redirect_to: `${appOrigin}${getOAuthRedirectPath()}`,
        });
        window.location.assign(`/api/auth/authorize?${params.toString()}`);
    };

    const signOut = async () => {
        try {
            await fetch("/api/auth/signout", {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("AuthContext: server signout failed", error);
        }

        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
        window.location.assign("/login");
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                loading,
                signInWithMicrosoft,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
