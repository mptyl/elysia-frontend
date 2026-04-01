"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
    UserProfileWithDepartment,
    UserProfile,
    Department,
} from "@/app/types/profile-types";

interface UseUserProfileResult {
    profile: UserProfileWithDepartment | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useUserProfile(userId: string | undefined): UseUserProfileResult {
    const [profile, setProfile] = useState<UserProfileWithDepartment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);

    const fetchProfile = useCallback(async () => {
        if (!userId) {
            setProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: profileRow, error: fetchError } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (fetchError) {
                throw fetchError;
            }

            let resolvedProfile = profileRow as UserProfile | null;
            if (!resolvedProfile) {
                const newProfile = {
                    id: userId,
                    department_id: null,
                    response_detail_level: "balanced",
                    communication_tone: "professional",
                    preferred_language: "it",
                    response_focus: "technical",
                    custom_instructions: "",
                    custom_instructions_mode: "append",
                };

                const { data: createdProfile, error: createError } = await supabase
                    .from("user_profiles")
                    .upsert(newProfile, { onConflict: "id" })
                    .select("*")
                    .single();

                if (createError) {
                    throw createError;
                }

                resolvedProfile = createdProfile as UserProfile;
            }

            // If display_name is missing, the initial sync-profile at login
            // likely failed. Retry it now and refetch the profile afterwards.
            if (!resolvedProfile.display_name) {
                try {
                    const syncRes = await fetch("/api/auth/sync-profile", {
                        method: "POST",
                        credentials: "include",
                    });
                    if (syncRes.ok) {
                        const { data: refreshed } = await supabase
                            .from("user_profiles")
                            .select("*")
                            .eq("id", userId)
                            .maybeSingle();
                        if (refreshed?.display_name) {
                            resolvedProfile = refreshed as UserProfile;
                        }
                    }
                } catch {
                    // sync failed — continue with what we have
                }
            }

            let dept: Department | null = null;
            if (resolvedProfile.department_id) {
                const { data: deptRow, error: deptError } = await supabase
                    .from("departments")
                    .select("id, code, name, created_at")
                    .eq("id", resolvedProfile.department_id)
                    .maybeSingle();

                if (deptError) {
                    throw deptError;
                }

                dept = (deptRow as Department | null) ?? null;
            }

            // Fetch user roles from the junction table
            const { data: rolesData, error: rolesError } = await supabase
                .from("user_roles")
                .select("roles(name)")
                .eq("user_id", resolvedProfile.id);

            if (rolesError) {
                throw rolesError;
            }

            const roles: string[] = (rolesData ?? [])
                .map((r: { roles: { name: string } | null }) => r.roles?.name)
                .filter((name): name is string => !!name);

            setProfile({
                ...resolvedProfile,
                roles,
                departments: dept,
            } as UserProfileWithDepartment);
        } catch (err) {
            const errorMessage =
                typeof err === "object" &&
                    err !== null &&
                    "message" in err &&
                    typeof (err as { message?: unknown }).message === "string"
                    ? ((err as { message: string }).message)
                    : "Failed to load profile";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [supabase, userId]);

    useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    return { profile, loading, error, refetch: fetchProfile };
}
