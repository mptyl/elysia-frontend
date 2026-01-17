/**
 * Athena Branding Configuration
 * 
 * This file centralizes all branding-specific constants.
 * It is used to separate the "Athena" identity from the upstream "Elysia" UI code,
 * facilitating easier updates and merges from the upstream repository.
 */

import { public_path } from "@/app/components/host";

export const BRANDING = {
  appName: "Athena",
  logoPath: `${public_path}logo.svg`,
  sidebar: {
    showGithub: false, // Upstream shows it, we hide it or move it
    showWeaviatePowered: true,
  },
  links: {
    documentation: "https://weaviate.github.io/elysia/",
    // Add other Athena-specific links here if needed
  }
};
