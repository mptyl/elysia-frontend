"use client";

import { BRANDING } from "@/app/config/branding";
import { MoveLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push("/login");
            } else {
                setUser(user);
            }
        };
        getUser();
    }, [router, supabase.auth]);

    if (!user) return null;

    return (
        <div className="flex flex-col h-full w-full gap-6 p-6 overflow-hidden">
            <div className="flex items-center gap-4">
                <Link href="/" className="hover:text-primary transition-colors">
                    <MoveLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold font-heading text-primary">
                    Profile
                </h1>
            </div>

            <div className="flex-1 w-full max-w-2xl bg-background_alt rounded-xl border border-border p-8 shadow-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-border">
                            {user.email?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">
                                {user.user_metadata?.full_name || "User"}
                            </h2>
                            <p className="text-secondary">{user.email}</p>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                            Account Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="p-4 rounded-lg bg-background border border-border">
                                <p className="text-xs text-secondary mb-1">User ID</p>
                                <p className="font-mono text-sm truncate" title={user.id}>
                                    {user.id}
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-background border border-border">
                                <p className="text-xs text-secondary mb-1">Last Sign In</p>
                                <p className="text-sm">
                                    {new Date(user.last_sign_in_at || "").toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
