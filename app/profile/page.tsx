"use client";

import { useEffect } from "react";

/**
 * Redirect from the old /profile route to the SPA profile page.
 * The profile is now rendered inside the main SPA at /?page=profile.
 */
export default function ProfileRedirect() {
    useEffect(() => {
        window.location.replace("/?page=profile");
    }, []);

    return null;
}
