import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SessionProvider } from "./components/contexts/SessionContext";
import { CollectionProvider } from "./components/contexts/CollectionContext";
import { ConversationProvider } from "./components/contexts/ConversationContext";
import { SocketProvider } from "./components/contexts/SocketContext";
import { EvaluationProvider } from "./components/contexts/EvaluationContext";
import { ToastProvider } from "./components/contexts/ToastContext";

import { Toaster } from "@/components/ui/toaster";

import { GoogleAnalytics } from "@next/third-parties/google";

import { RouterProvider } from "./components/contexts/RouterContext";
import { ProcessingProvider } from "./components/contexts/ProcessingContext";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Athena",
  description: "Your AI Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_G_KEY || ""} />
      <body
        className="bg-background h-screen w-screen overflow-hidden font-text antialiased flex"
      >
        <Suspense fallback={<div>Loading...</div>}>
          <ToastProvider>
            <RouterProvider>
              <SessionProvider>
                <CollectionProvider>
                  <ConversationProvider>
                    <SocketProvider>
                      <EvaluationProvider>
                        <ProcessingProvider>
                          <AuthGuard>
                            <AppShell>
                              {children}
                            </AppShell>
                          </AuthGuard>
                        </ProcessingProvider>
                        <Toaster />
                      </EvaluationProvider>
                    </SocketProvider>
                  </ConversationProvider>
                </CollectionProvider>
              </SessionProvider>
            </RouterProvider>
          </ToastProvider>
        </Suspense>
      </body>
    </html>
  );
}
