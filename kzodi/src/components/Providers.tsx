"use client";
import { SessionProvider } from "next-auth/react";
import AppRuntimeBridge from "@/components/system/AppRuntimeBridge";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchWhenOffline={false}>
            <AppRuntimeBridge />
            {children}
        </SessionProvider>
    );
}
