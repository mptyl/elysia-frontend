"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrgUnit } from "@/app/types/profile-types";

interface UseOrgUnitsResult {
    orgUnits: OrgUnit[];
    loading: boolean;
    error: string | null;
}

export function useOrgUnits(): UseOrgUnitsResult {
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchOrgUnits = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from("org_units")
                    .select("*")
                    .order("name");

                if (fetchError) {
                    throw fetchError;
                }

                setOrgUnits(data as OrgUnit[]);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load org units");
            } finally {
                setLoading(false);
            }
        };

        fetchOrgUnits();
    }, []);

    return { orgUnits, loading, error };
}
