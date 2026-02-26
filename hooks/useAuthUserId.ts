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
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                // Expected on public pages (login, callback) where no session exists.
                // Use console.warn to avoid triggering Next.js dev error overlay.
                console.warn("useAuthUserId: no active session:", error.message);
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
