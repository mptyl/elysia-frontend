/**
 * Directory Service client — uses the Microsoft Graph API interface.
 * In dev, points to the LDAP emulator (Graph-compatible).
 * In prod, points to https://graph.microsoft.com.
 *
 * Configuration:
 *   DIRECTORY_SERVICE_URL — base URL of the service (no trailing slash)
 *   DIRECTORY_SERVICE_AUTH_MODE — "none" (emulator) | "bearer" (prod, uses Graph access token)
 */

export interface DirectoryUserInfo {
    id: string;
    displayName: string;
    jobTitle: string | null;
    department: string | null;
    mail: string;
}

const GRAPH_SELECT_FIELDS = "id,displayName,jobTitle,department,mail";

export async function fetchDirectoryUser(
    userUpn: string,
    accessToken?: string,
): Promise<DirectoryUserInfo | null> {
    const baseUrl = process.env.DIRECTORY_SERVICE_URL;
    if (!baseUrl) {
        console.warn("[DirectoryService] DIRECTORY_SERVICE_URL not configured, skipping profile sync");
        return null;
    }

    const url = `${baseUrl}/v1.0/users/${encodeURIComponent(userUpn)}?$select=${GRAPH_SELECT_FIELDS}`;

    const headers: Record<string, string> = { Accept: "application/json" };

    if (process.env.DIRECTORY_SERVICE_AUTH_MODE === "bearer" && accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        console.error(`[DirectoryService] Failed to fetch user ${userUpn}: ${response.status}`);
        return null;
    }

    return response.json();
}
