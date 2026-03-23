"use client";

import { Save, Loader2 } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { navigateTo } from "@/app/components/host";
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
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";
import { useRefetchLocale } from "@/app/components/contexts/I18nContext";
import { CollectionContext } from "@/app/components/contexts/CollectionContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRoleStandardInstructions } from "@/hooks/useRoleStandardInstructions";
import type {
    ResponseDetailLevel,
    CommunicationTone,
    PreferredLanguage,
    ResponseFocus,
    CustomInstructionsMode,
} from "@/app/types/profile-types";

export default function ProfilePage() {
    const t = useTranslations("profile");
    const tc = useTranslations("common");
    const refetchLocale = useRefetchLocale();
    const { fetchCollections } = useContext(CollectionContext);
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);

    const { profile, loading: profileLoading, error: profileError, refetch } = useUserProfile(user?.id);

    // Form state
    const [responseDetailLevel, setResponseDetailLevel] = useState<ResponseDetailLevel>("balanced");
    const [communicationTone, setCommunicationTone] = useState<CommunicationTone>("professional");
    const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>("it");
    const [responseFocus, setResponseFocus] = useState<ResponseFocus>("technical");
    const [customInstructions, setCustomInstructions] = useState("");
    const [customInstructionsMode, setCustomInstructionsMode] = useState<CustomInstructionsMode>("append");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Standard instructions for the user's department/jobTitle
    const {
        instructions: standardInstructions,
        loading: stdInstrLoading,
    } = useRoleStandardInstructions(profile?.department, profile?.job_title);

    // Load user on mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                navigateTo("/login");
            } else {
                setUser(user);
            }
        };
        getUser();
    }, [supabase.auth]);

    // Sync form state with profile data
    useEffect(() => {
        if (profile) {
            setResponseDetailLevel(profile.response_detail_level);
            setCommunicationTone(profile.communication_tone);
            setPreferredLanguage(profile.preferred_language);
            setResponseFocus(profile.response_focus);
            setCustomInstructions(profile.custom_instructions || "");
            setCustomInstructionsMode(profile.custom_instructions_mode || "append");
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
                    response_detail_level: responseDetailLevel,
                    communication_tone: communicationTone,
                    preferred_language: preferredLanguage,
                    response_focus: responseFocus,
                    custom_instructions: customInstructions,
                    custom_instructions_mode: customInstructionsMode,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            setSaveSuccess(true);
            await refetch();
            await refetchLocale();
            fetchCollections();

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    const isLoading = profileLoading;
    const hasError = profileError;

    return (
        <div className="flex flex-col items-center flex-1 self-stretch h-[calc(100vh-120px)] min-h-0 gap-6 p-6 pb-12 overflow-y-auto">
            <h1 className="text-2xl font-bold font-heading text-primary shrink-0">
                {t('title')}
            </h1>

            <div className="w-full max-w-4xl bg-background_alt rounded-xl border border-border p-8 shadow-sm flex-shrink-0 mb-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : hasError ? (
                    <div className="text-red-500 p-4 bg-red-500/10 rounded-lg">
                        {profileError}
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
                                    {user.user_metadata?.full_name || t('fallbackName')}
                                </h2>
                                <p className="text-secondary">{user.email}</p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-border" />

                        {/* Section 1: Identità Organizzativa */}
                        <h3 className="text-lg font-semibold text-foreground">
                            {t('organizationalIdentity')}
                        </h3>

                        <div className="flex gap-4">
                            {/* Department (read-only) */}
                            <div className="flex flex-col gap-2 w-1/5">
                                <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                    {t('department')}
                                </Label>
                                <div className="p-3 rounded-lg bg-background border border-border text-sm text-secondary">
                                    {profile?.department || (
                                        <span className="italic text-secondary/50">
                                            {tc('notAvailable')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Job Title (read-only) */}
                            <div className="flex flex-col gap-2 flex-1">
                                <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                    {t('jobTitle')}
                                </Label>
                                <div className="p-3 rounded-lg bg-background border border-border text-sm text-secondary">
                                    {profile?.job_title || (
                                        <span className="italic text-secondary/50">
                                            {tc('notAvailable')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-border" />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Livello di dettaglio */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                    {t('detailLevel')}
                                </Label>
                                <Select
                                    value={responseDetailLevel}
                                    onValueChange={(v) => setResponseDetailLevel(v as ResponseDetailLevel)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="executive_summary">{t('executiveSummary')}</SelectItem>
                                        <SelectItem value="balanced">{t('balanced')}</SelectItem>
                                        <SelectItem value="operational_detail">{t('operationalDetail')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tono */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                    {t('tone')}
                                </Label>
                                <Select
                                    value={communicationTone}
                                    onValueChange={(v) => setCommunicationTone(v as CommunicationTone)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="formal">{t('formal')}</SelectItem>
                                        <SelectItem value="professional">{t('professional')}</SelectItem>
                                        <SelectItem value="direct">{t('direct')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lingua preferita */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                    {t('preferredLanguage')}
                                </Label>
                                <Select
                                    value={preferredLanguage}
                                    onValueChange={(v) => setPreferredLanguage(v as PreferredLanguage)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="it">{t('italian')}</SelectItem>
                                        <SelectItem value="en">{t('english')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Focus risposte */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                    {t('responseFocus')}
                                </Label>
                                <Select
                                    value={responseFocus}
                                    onValueChange={(v) => setResponseFocus(v as ResponseFocus)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normative">{t('normative')}</SelectItem>
                                        <SelectItem value="managerial">{t('managerial')}</SelectItem>
                                        <SelectItem value="technical">{t('technical')}</SelectItem>
                                        <SelectItem value="relational">{t('relational')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="h-px w-full bg-border" />

                        {/* Standard Instructions (read-only) */}
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                {t('standardInstructions')}
                            </Label>
                            <div className="w-full min-h-[120px] p-4 rounded-lg bg-background border border-border text-sm text-secondary whitespace-pre-wrap">
                                {stdInstrLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('loadingInstructions')}
                                    </span>
                                ) : standardInstructions ? (
                                    standardInstructions
                                ) : (
                                    <span className="italic text-secondary/50">
                                        {t('noStandardInstructions')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Custom Instructions */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="custom-instructions" className="text-sm font-semibold text-secondary uppercase tracking-wider">
                                {t('customInstructions')}
                            </Label>
                            <textarea
                                id="custom-instructions"
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                placeholder={t('customInstructionsPlaceholder')}
                                className="w-full min-h-[200px] p-4 rounded-lg bg-background border border-foreground_alt text-primary text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary transition-colors font-mono"
                            />
                        </div>

                        {/* Override switch */}
                        <div className="flex items-center gap-3">
                            <Switch
                                id="instructions-mode"
                                checked={customInstructionsMode === "override"}
                                onCheckedChange={(checked) =>
                                    setCustomInstructionsMode(checked ? "override" : "append")
                                }
                            />
                            <Label htmlFor="instructions-mode" className="text-sm font-semibold text-secondary uppercase tracking-wider cursor-pointer">
                                {t('overrideStandard')}
                            </Label>
                            <span className="text-sm text-primary">
                                {customInstructionsMode === "override"
                                    ? t('overrideActive')
                                    : t('appendActive')}
                            </span>
                        </div>

                        <div className="h-px w-full bg-border" />

                        {/* Save Button */}
                        <div className="flex justify-end items-center gap-4">
                            {saveSuccess && (
                                <span className="text-green-500 text-sm">{t('saved')}</span>
                            )}
                            {saveError && (
                                <span className="text-red-500 text-sm">{saveError}</span>
                            )}
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
                                {tc('save')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
