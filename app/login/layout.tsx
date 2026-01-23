import { Manrope, Space_Grotesk } from "next/font/google";
import "../globals.css";

const space_grotesk = Space_Grotesk({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-text",
    weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-heading",
    weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata = {
    title: "Login - Athena",
    description: "Sign in to Athena AI Platform",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                className={`bg-background min-h-screen ${space_grotesk.variable} ${manrope.variable} font-text antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
