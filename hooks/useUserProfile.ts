"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfileWithOrgUnit, AIIdentityMode } from "@/app/types/profile-types";

interface UseUserProfileResult {
    profile: UserProfileWithOrgUnit | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useUserProfile(userId: string | undefined): UseUserProfileResult {
    const [profile, setProfile] = useState<UserProfileWithOrgUnit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const fetchProfile = async () => {
        // Check for Auth Bypass Mode
        if (process.env.NEXT_PUBLIC_AUTH_ENABLED === "false") {
            setLoading(false);
            const savedProfile = typeof window !== 'undefined' ? localStorage.getItem("mock_user_profile") : null;
            if (savedProfile) {
                setProfile(JSON.parse(savedProfile));
            } else {
                setProfile({
                    id: "1234",
                    org_unit: "mock-unit",
                    app_role: "admin",
                    ai_identity_user: "Mock Identity Context",
                    ai_identity_mode: "APPEND",
                    org_units: {
                        id: "mock-unit",
                        name: "Mock Unit",
                        ai_identity_base: "Base Mock Identity"
                    }
                } as UserProfileWithOrgUnit);
            }
            return;
        }

        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Try to fetch existing profile with org unit join
            const { data, error: fetchError } = await supabase
                .from("user_profiles")
                .select(`
                    *,
                    org_units (
                        id,
                        name,
                        ai_identity_base
                    )
                `)
                .eq("id", userId)
                .single();

            if (fetchError) {
                // Profile doesn't exist - create on-the-fly without org_unit
                if (fetchError.code === "PGRST116") {
                    const newProfile = {
                        id: userId,
                        org_unit: null,
                        app_role: "user",
                        ai_identity_user: "",
                        ai_identity_mode: "APPEND" as AIIdentityMode,
                    };

                    const { data: createdProfile, error: createError } = await supabase
                        .from("user_profiles")
                        .insert(newProfile)
                        .select(`
                            *,
                            org_units (
                                id,
                                name,
                                ai_identity_base
                            )
                        `)
                        .single();

                    if (createError) {
                        throw createError;
                    }

                    setProfile(createdProfile as UserProfileWithOrgUnit);
                } else {
                    throw fetchError;
                }
            } else {
                setProfile(data as UserProfileWithOrgUnit);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    return { profile, loading, error, refetch: fetchProfile };
}
