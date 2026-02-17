"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRoleStandardInstructionsResult {
    instructions: string | null;
    loading: boolean;
    error: string | null;
}

export function useRoleStandardInstructions(
    department: string | null | undefined,
    jobTitle: string | null | undefined
): UseRoleStandardInstructionsResult {
    const [instructions, setInstructions] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);

    const fetch = useCallback(async () => {
        if (!department || !jobTitle) {
            setInstructions(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from("role_standard_instructions")
                .select("instructions")
                .eq("department", department)
                .eq("job_title", jobTitle)
                .maybeSingle();

            if (fetchError) throw fetchError;

            setInstructions(data?.instructions ?? null);
        } catch (err) {
            const msg =
                typeof err === "object" && err !== null && "message" in err
                    ? (err as { message: string }).message
                    : "Failed to load standard instructions";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [supabase, department, jobTitle]);

    useEffect(() => {
        void fetch();
    }, [fetch]);

    return { instructions, loading, error };
}
