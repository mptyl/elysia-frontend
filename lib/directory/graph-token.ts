/**
 * Microsoft Graph API token provider — Client Credentials Flow.
 *
 * Uses the app's own identity (client_id + client_secret) to obtain
 * an access token for Microsoft Graph API. This is server-to-server
 * and does not depend on the user's OAuth session.
 *
 * Required env vars:
 *   AZURE_TENANT_ID   — Entra ID tenant
 *   AZURE_CLIENT_ID   — App registration client ID
 *   AZURE_CLIENT_SECRET — App registration client secret
 *
 * The token is cached in memory and reused until 5 minutes before expiry.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getGraphAccessToken(): Promise<string | null> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
        return cachedToken.token;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        console.warn(
            "[GraphToken] AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET not configured, skipping Graph token acquisition",
        );
        return null;
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
    });

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(
                `[GraphToken] Token request failed: ${res.status} — ${errorBody}`,
            );
            return null;
        }

        const data = await res.json();
        cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + data.expires_in * 1000,
        };
        return cachedToken.token;
    } catch (err) {
        console.error("[GraphToken] Token request error:", err);
        return null;
    }
}
