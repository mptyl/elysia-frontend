"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function UserNav() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            console.log("UserNav: Fetching session...");
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

            if (error) console.error("UserNav: Error getting session", error);

            console.log("UserNav: Session found:", !!session);
            setUser(session?.user ?? null);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("UserNav: Auth change", _event);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    // 1. Loading State
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    if (!isMounted) return null; // Prevent hydration mismatch

    if (!user) {
        // 2. Guest / Not Found State - Render this to verify positioning!
        return (
            <div className="fixed top-2 right-2 z-[150]">
                <Button
                    variant="ghost"
                    className="h-10 border border-dashed border-secondary text-secondary hover:text-primary gap-2 px-3"
                    onClick={() => router.push("/login")}
                >
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm">Guest (Login)</span>
                </Button>
            </div>
        );
    }

    // 3. Authenticated User State
    // Derive initials or display name
    const email = user.email || "";
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "User";
    const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

    return (
        <div className="fixed top-2 right-2 z-[150]">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-10 text-secondary hover:bg-foreground_alt hover:text-primary gap-2 px-3 transition-colors duration-200"
                    >
                        <Avatar className="h-5 w-5 border border-border">
                            <AvatarImage src={user.user_metadata?.avatar_url} alt={name} />
                            <AvatarFallback className="bg-primary/10 text-[10px] items-center justify-center flex font-medium text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{name}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => router.push("/profile")}>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
