"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BRANDING } from "@/app/config/branding";

export function useThemeLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return BRANDING.logoPath;
  return resolvedTheme === "light" ? BRANDING.logoPathLight : BRANDING.logoPathDark;
}
