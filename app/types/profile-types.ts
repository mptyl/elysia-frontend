/**
 * Types for User Profile and AI Identity management
 */

export type AIIdentityMode = "APPEND" | "REPLACE";

export interface OrgUnit {
    id: string;
    name: string;
    ai_identity_base: string;
    created_at?: string;
}

export interface UserProfile {
    id: string;
    org_unit: string | null;
    app_role: string;
    ai_identity_user: string;
    ai_identity_mode: AIIdentityMode;
    created_at?: string;
    updated_at?: string;
}

export interface UserProfileWithOrgUnit extends UserProfile {
    org_units: OrgUnit | null;
}
