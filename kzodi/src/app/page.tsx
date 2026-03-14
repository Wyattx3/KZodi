"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import LandingPage from "@/components/landing/LandingPage";

const ChatLandingPage = dynamic(() => import("@/components/landing/ChatLandingPage"));

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isAppMode, setIsAppMode] = useState(false);
  const view = searchParams.get("view") === "chat-landing" ? "chat-landing" : "landing";

  // Auto-redirect to /chat if already logged in, in PWA standalone mode, or in Capacitor native app
  useEffect(() => {
    const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
    const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;
    const isApp = isStandalone || isCapacitor;
    setIsAppMode(isApp);

    // In native app or installed PWA — go to chat only if authenticated
    if (isApp && status === "authenticated" && session) {
      router.replace("/chat");
      return;
    }

    // On web browser — also redirect if authenticated
    if (!isApp && status === "authenticated" && session) {
      router.replace("/chat");
    }
  }, [status, session, router]);

  // In app mode (Capacitor/PWA), always show ChatLandingPage (Get Started), never the marketing landing
  const effectiveView = isAppMode ? "chat-landing" : view;

  const handleChatGetStarted = () => {
    const isAstrologerRedirect = typeof window !== 'undefined' ? localStorage.getItem("pendingAstrologerRedirect") : null;
    import("next-auth/react").then(({ signIn }) => {
      signIn("google", { callbackUrl: isAstrologerRedirect ? "/chat?astrologer=true" : "/chat" });
    });
  };

  const handleChatBack = () => {
    router.push("/");
    if (typeof window !== 'undefined') {
      localStorage.removeItem("pendingAstrologerRedirect");
    }
  };

  return (
    <div className="chat-app" style={{ height: '100dvh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {effectiveView === "landing" && (
          <LandingPage key="landing" />
        )}

        {effectiveView === "chat-landing" && (
          <ChatLandingPage
            key="chat-landing"
            onGetStarted={handleChatGetStarted}
            onBack={handleChatBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <HomeContent />
    </React.Suspense>
  );
}
