"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import LandingPage from "@/components/landing/LandingPage";

const ChatLandingPage = dynamic(() => import("@/components/landing/ChatLandingPage"));

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "chat-landing" ? "chat-landing" : "landing";

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
        {view === "landing" && (
          <LandingPage key="landing" />
        )}

        {view === "chat-landing" && (
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
