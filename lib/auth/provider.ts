export type AuthProviderMode = "emulator" | "entra";

const VALID_AUTH_PROVIDER_MODES: ReadonlySet<string> = new Set([
    "emulator",
    "entra",
]);

function normalizeMode(value: string | undefined): AuthProviderMode | null {
    if (!value) {
        return null;
    }
    const trimmed = value.trim().toLowerCase();
    if (VALID_AUTH_PROVIDER_MODES.has(trimmed)) {
        return trimmed as AuthProviderMode;
    }
    return null;
}

export function getAuthProviderMode(): AuthProviderMode {
    const publicMode = normalizeMode(process.env.NEXT_PUBLIC_AUTH_PROVIDER);
    // In the browser we only trust NEXT_PUBLIC_* values.
    // Reading server-only envs in client bundles may produce undefined or stale values.
    const serverMode =
        typeof window === "undefined"
            ? normalizeMode(process.env.AUTH_PROVIDER_MODE)
            : null;

    if (publicMode && serverMode && publicMode !== serverMode) {
        throw new Error(
            "Invalid auth config: NEXT_PUBLIC_AUTH_PROVIDER and AUTH_PROVIDER_MODE must match."
        );
    }

    const resolved = publicMode ?? serverMode;
    if (!resolved) {
        throw new Error(
            "Missing auth provider configuration. Set NEXT_PUBLIC_AUTH_PROVIDER (emulator|entra)."
        );
    }

    return resolved;
}

export function isEmulatorAuthProvider(mode = getAuthProviderMode()): boolean {
    return mode === "emulator";
}

export function getOAuthRedirectPath(): string {
    const path = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_PATH || "/auth/callback";
    if (!path.startsWith("/")) {
        throw new Error(
            "Invalid NEXT_PUBLIC_OAUTH_REDIRECT_PATH. It must start with '/'."
        );
    }
    return path;
}
