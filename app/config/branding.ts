/**
 * Athena Branding Configuration
 * 
 * This file centralizes all branding-specific constants.
 * It is used to separate the "Athena" identity from the upstream "Elysia" UI code,
 * facilitating easier updates and merges from the upstream repository.
 */

import { public_path } from "@/app/components/host";

export const BRANDING = {
  appName: "Atena",
  logoPath: `${public_path}mondo-uni-neg.png`,
  logoPathDark: `${public_path}mondo-uni-neg.png`,
  logoPathLight: `${public_path}mondo-uni.png`,
  sidebar: {
    showGithub: false, // Upstream shows it, we hide it or move it
    showWeaviatePowered: true,
  },
  links: {
    // Add other Athena-specific links here if needed
  }
};
