"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

/**
 * Hook that returns the authenticated Supabase user's ID.
 * Replaces the legacy useDeviceId hook for user identity.
 * 
 * @returns The user ID (UUID) if authenticated, null otherwise
 */
export function useAuthUserId() {
    const [id, setId] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchUser = useCallback(async () => {
        if (process.env.NEXT_PUBLIC_AUTH_ENABLED === "false") {
            // Mock user for local development
            const mockUser: User = {
                id: "1234",
                aud: "authenticated",
                role: "authenticated",
                email: "mock@local",
                phone: "",
                app_metadata: {
                    provider: "email",
                    providers: ["email"]
                },
                user_metadata: {},
                identities: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_anonymous: false
            };
            setUser(mockUser);
            setId("1234");
            setLoading(false);
            return;
        }

        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error("Error fetching user:", error.message);
                setUser(null);
                setId(null);
            } else if (user) {
                setUser(user);
                setId(user.id);
            } else {
                setUser(null);
                setId(null);
            }
        } catch (err) {
            console.error("Failed to get auth user:", err);
            setUser(null);
            setId(null);
        } finally {
            setLoading(false);
        }
    }, [supabase.auth]);

    useEffect(() => {
        // Initial fetch
        fetchUser();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (process.env.NEXT_PUBLIC_AUTH_ENABLED === "false") {
                    return;
                }

                if (session?.user) {
                    setUser(session.user);
                    setId(session.user.id);
                } else {
                    setUser(null);
                    setId(null);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUser, supabase.auth]);

    return { id, user, loading };
}
