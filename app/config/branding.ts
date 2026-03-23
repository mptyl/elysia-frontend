/**
 * Athena Branding Configuration
 * 
 * This file centralizes all branding-specific constants.
 * It is used to separate the "Athena" identity from the upstream "Elysia" UI code,
 * facilitating easier updates and merges from the upstream repository.
 */

import { public_path } from "@/app/components/host";

export const CHAT_I18N = {
  it: {
    askTitle: "Chiedi ad Atena",
    placeholderInitial: "Cosa vuoi chiedere oggi?",
    placeholderFollowUp: "Fai una domanda di approfondimento...",
    relatedQuestions: "Domande correlate",
  },
  en: {
    askTitle: "Ask Atena",
    placeholderInitial: "What will you ask today?",
    placeholderFollowUp: "Ask a follow up question...",
    relatedQuestions: "Related Questions",
  },
} as const;

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
