"use client";

import { MoveLeft, Save, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOrgUnits } from "@/hooks/useOrgUnits";
import type { AIIdentityMode, OrgUnit } from "@/app/types/profile-types";

export default function ProfilePage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    // Profile and org units data
    const { profile, loading: profileLoading, error: profileError, refetch } = useUserProfile(user?.id);
    const { orgUnits, loading: orgUnitsLoading, error: orgUnitsError } = useOrgUnits();

    // Form state
    const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string | null>(null);
    const [aiIdentityUser, setAiIdentityUser] = useState("");
    const [aiIdentityMode, setAiIdentityMode] = useState<AIIdentityMode>("APPEND");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Get ai_identity_base from selected org unit
    const selectedOrgUnit = orgUnits.find((ou) => ou.id === selectedOrgUnitId);
    const aiIdentityBase = selectedOrgUnit?.ai_identity_base || "";

    // Load user on mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push("/login");
            } else {
                setUser(user);
            }
        };
        getUser();
    }, [router, supabase.auth]);

    // Sync form state with profile data
    useEffect(() => {
        if (profile) {
            setSelectedOrgUnitId(profile.org_unit);
            setAiIdentityUser(profile.ai_identity_user || "");
            setAiIdentityMode(profile.ai_identity_mode || "APPEND");
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const { error } = await supabase
                .from("user_profiles")
                .upsert({
                    id: user.id,
                    org_unit: selectedOrgUnitId,
                    ai_identity_user: aiIdentityUser,
                    ai_identity_mode: aiIdentityMode,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            setSaveSuccess(true);
            await refetch();

            // Clear success message after 3 seconds
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.push("/");
    };

    if (!user) return null;

    const isLoading = profileLoading || orgUnitsLoading;
    const hasError = profileError || orgUnitsError;

    return (
        <div className="flex flex-col items-center h-full w-full gap-6 p-6 overflow-hidden">
            <div className="flex items-center gap-4">
                <Link href="/" className="hover:text-primary transition-colors">
                    <MoveLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold font-heading text-primary">
                    Profile
                </h1>
            </div>

            <div className="flex-1 w-full max-w-2xl bg-background_alt rounded-xl border border-border p-8 shadow-sm overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : hasError ? (
                    <div className="text-red-500 p-4 bg-red-500/10 rounded-lg">
                        {profileError || orgUnitsError}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* User Info Header */}
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-border">
                                {user.email?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    {user.user_metadata?.full_name || "User"}
                                </h2>
                                <p className="text-secondary">{user.email}</p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-border" />

                        {/* Org Unit Selection */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="org-unit" className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                Organizational Unit
                            </Label>
                            <Select
                                value={selectedOrgUnitId || ""}
                                onValueChange={(value) => setSelectedOrgUnitId(value || null)}
                            >
                                <SelectTrigger id="org-unit" className="w-full">
                                    <SelectValue placeholder="Select an org unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {orgUnits.map((ou) => (
                                        <SelectItem key={ou.id} value={ou.id}>
                                            {ou.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* AI Identity Base (Read-only) */}
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                AI Identity Base (from Org Unit)
                            </Label>
                            <div className="p-4 rounded-lg bg-background border border-border min-h-[100px] text-sm text-secondary whitespace-pre-wrap">
                                {aiIdentityBase || (
                                    <span className="italic text-secondary/50">
                                        No org unit selected or no base identity defined
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* AI Identity User (Editable) */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="ai-identity-user" className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                AI Identity User
                            </Label>
                            <textarea
                                id="ai-identity-user"
                                value={aiIdentityUser}
                                onChange={(e) => setAiIdentityUser(e.target.value)}
                                placeholder="Enter your custom AI context..."
                                className="w-full min-h-[150px] p-4 rounded-lg bg-background border border-foreground_alt text-primary text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary transition-colors font-mono"
                            />
                        </div>

                        {/* AI Identity Mode */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="ai-identity-mode" className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                AI Identity Mode
                            </Label>
                            <Select
                                value={aiIdentityMode}
                                onValueChange={(value) => setAiIdentityMode(value as AIIdentityMode)}
                            >
                                <SelectTrigger id="ai-identity-mode" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="APPEND">
                                        APPEND - Combine base + user identity
                                    </SelectItem>
                                    <SelectItem value="REPLACE">
                                        REPLACE - User identity only
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-px w-full bg-border" />

                        {/* Save/Cancel Buttons */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save
                            </Button>
                            <Button
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Back to Home Page
                            </Button>
                            {saveSuccess && (
                                <span className="text-green-500 text-sm">Profile saved successfully!</span>
                            )}
                            {saveError && (
                                <span className="text-red-500 text-sm">{saveError}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
