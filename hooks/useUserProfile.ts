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
                    app_role: "user",
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

            setProfile({
                ...resolvedProfile,
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
