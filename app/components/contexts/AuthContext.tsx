"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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
    }, []);

    const signInWithMicrosoft = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "azure",
            options: {
                scopes: "openid profile email",
                redirectTo: "http://localhost:3090",
            },
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
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
