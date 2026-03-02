"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <SidebarMenuButton>
        <IoMoonOutline />
        <p>Theme</p>
      </SidebarMenuButton>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <SidebarMenuButton
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <IoSunnyOutline /> : <IoMoonOutline />}
      <p>{isDark ? "Light Theme" : "Dark Theme"}</p>
    </SidebarMenuButton>
  );
}
