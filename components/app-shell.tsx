"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import SidebarComponent from "@/app/components/navigation/SidebarComponent";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StartDialog from "@/app/components/dialog/StartDialog";

interface AppShellProps {
    children: ReactNode;
}

/**
 * AppShell conditionally renders the sidebar and main wrapper.
 * For auth-related pages (like /login), it renders children directly.
 * For all other pages, it renders the full app shell with sidebar.
 */
export function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();

    // Pages that should bypass the app shell (standalone pages)
    const standalonePages = ["/login"];
    const isStandalonePage = standalonePages.includes(pathname || "");

    // For standalone pages, render children directly without app shell
    if (isStandalonePage) {
        return <>{children}</>;
    }

    // For regular app pages, render full app shell with sidebar
    return (
        <SidebarProvider>
            <SidebarComponent />
            <main className="relative flex flex-1 min-w-0 flex-col md:flex-row w-full gap-2 md:gap-6 items-start justify-start p-2 md:p-6 overflow-hidden">
                <SidebarTrigger className="lg:hidden flex text-secondary hover:text-primary hover:bg-foreground_alt z-50" />
                <StartDialog />
                {children}
            </main>
        </SidebarProvider>
    );
}
