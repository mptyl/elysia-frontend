/**
 * Types for User Profile and AI Identity management
 */

export type ResponseDetailLevel = "executive_summary" | "balanced" | "operational_detail";
export type CommunicationTone = "formal" | "professional" | "direct";
export type PreferredLanguage = "it" | "en";
export type ResponseFocus = "normative" | "managerial" | "technical" | "relational";
export type CustomInstructionsMode = "append" | "override";

export interface RoleStandardInstructions {
    id: string;
    department: string;
    job_title: string;
    instructions: string;
    created_at?: string;
    updated_at?: string;
}

export interface Department {
    id: string;
    code: string;
    name: string;
    created_at?: string;
}

export interface UserProfile {
    id: string;
    display_name: string | null;
    department_id: string | null;
    job_title: string | null;
    department: string | null;
    roles: string[];
    response_detail_level: ResponseDetailLevel;
    communication_tone: CommunicationTone;
    preferred_language: PreferredLanguage;
    response_focus: ResponseFocus;
    custom_instructions: string;
    custom_instructions_mode: CustomInstructionsMode;
    created_at?: string;
    updated_at?: string;
}

export interface UserProfileWithDepartment extends UserProfile {
    departments: Department | null;
}
