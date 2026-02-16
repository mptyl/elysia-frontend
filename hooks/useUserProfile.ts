"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
    UserProfileWithOrgUnit,
    AIIdentityMode,
    UserProfile,
    OrgUnit,
} from "@/app/types/profile-types";

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
                    org_unit: null,
                    app_role: "user",
                    ai_identity_user: "",
                    ai_identity_mode: "APPEND" as AIIdentityMode,
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

            let orgUnit: OrgUnit | null = null;
            if (resolvedProfile.org_unit) {
                const { data: orgUnitRow, error: orgUnitError } = await supabase
                    .from("org_units")
                    .select("id, name, ai_identity_base, created_at")
                    .eq("id", resolvedProfile.org_unit)
                    .maybeSingle();

                if (orgUnitError) {
                    throw orgUnitError;
                }

                orgUnit = (orgUnitRow as OrgUnit | null) ?? null;
            }

            setProfile({
                ...resolvedProfile,
                org_units: orgUnit,
            } as UserProfileWithOrgUnit);
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
