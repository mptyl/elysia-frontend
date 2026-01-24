export const metadata = {
    title: "Login - Athena",
    description: "Sign in to Athena AI Platform",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Note: This layout is nested under root layout.tsx which provides <html> and <body>
    // We only provide the wrapper for login content here
    return <>{children}</>;
}
