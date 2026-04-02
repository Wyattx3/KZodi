"use client";

import { Capacitor } from "@capacitor/core";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useChatStore } from "@/lib/chatStore";

function detectInstalledShell() {
    if (typeof window === "undefined") {
        return false;
    }

    const safariStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    return Capacitor.isNativePlatform() || window.matchMedia("(display-mode: standalone)").matches || safariStandalone;
}

export default function AppShellAuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { status } = useSession();
    const ownerUserId = useChatStore((state) => state.ownerUserId);
    const conversationsCount = useChatStore((state) => Object.keys(state.conversations).length);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
    const [hasHydrated, setHasHydrated] = useState(() => useChatStore.persist.hasHydrated());
    const [installedShell, setInstalledShell] = useState(false);

    useEffect(() => {
        setInstalledShell(detectInstalledShell());
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        const unsubscribeHydrate = useChatStore.persist.onHydrate(() => {
            setHasHydrated(false);
        });
        const unsubscribeFinishHydration = useChatStore.persist.onFinishHydration(() => {
            setHasHydrated(true);
        });

        setHasHydrated(useChatStore.persist.hasHydrated());

        return () => {
            unsubscribeHydrate();
            unsubscribeFinishHydration();
        };
    }, []);

    const canUseOfflineShell = useMemo(() => {
        if (!hasHydrated || isOnline) {
            return false;
        }

        if (!ownerUserId) {
            return false;
        }

        return conversationsCount > 0 || installedShell;
    }, [conversationsCount, hasHydrated, installedShell, isOnline, ownerUserId]);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        if (status === "unauthenticated" && !canUseOfflineShell) {
            router.replace("/");
        }
    }, [canUseOfflineShell, hasHydrated, router, status]);

    if (status === "authenticated" || canUseOfflineShell) {
        return <>{children}</>;
    }

    return <div className="min-h-[100dvh] w-full" style={{ backgroundColor: "#0E0C0A" }} />;
}
