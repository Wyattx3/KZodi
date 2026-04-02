"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { readOfflineSnapshot, type OfflineConversationSnapshot } from "@/lib/offlineSync";

export default function OfflinePage() {
    const [snapshot, setSnapshot] = useState<OfflineConversationSnapshot | null>(null);

    useEffect(() => {
        void readOfflineSnapshot().then((value) => {
            setSnapshot(value);
        });
    }, []);

    const recentConversations = snapshot?.conversations.slice(0, 6) ?? [];

    return (
        <main
            className="min-h-[100dvh] px-6 py-10 flex items-center justify-center"
            style={{
                background: "radial-gradient(circle at top, rgba(255,229,102,0.12), transparent 38%), linear-gradient(180deg, #111111 0%, #181512 100%)",
                color: "#F8F4EA",
            }}
        >
            <div
                className="w-full max-w-[560px] rounded-[28px] p-6 md:p-8"
                style={{
                    background: "rgba(20, 18, 15, 0.88)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
                    backdropFilter: "blur(22px)",
                }}
            >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "rgba(255,229,102,0.7)" }}>
                    Offline Mode
                </div>
                <h1 className="mt-3 text-[28px] font-semibold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                    Your Kakoei shell is still here.
                </h1>
                <p className="mt-3 text-[15px] leading-7" style={{ color: "rgba(248,244,234,0.72)" }}>
                    Cached UI and saved chat history remain available. When your connection comes back, queued changes and the latest app version will sync automatically.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/chat"
                        className="rounded-full px-5 py-3 text-[14px] font-semibold transition-opacity"
                        style={{ backgroundColor: "#FFE566", color: "#17120F" }}
                    >
                        Open Chat Shell
                    </Link>
                    <Link
                        href="/story/explore"
                        className="rounded-full px-5 py-3 text-[14px] font-semibold transition-opacity"
                        style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#F8F4EA" }}
                    >
                        Browse Story Shell
                    </Link>
                </div>

                {recentConversations.length > 0 && (
                    <section className="mt-8">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.42)" }}>
                            Recent Cached Conversations
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                            {recentConversations.map((conversation) => (
                                <div
                                    key={conversation.characterId}
                                    className="rounded-[18px] px-4 py-3"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div className="text-[15px] font-semibold">{conversation.title}</div>
                                    <div className="mt-1 text-[13px] leading-6" style={{ color: "rgba(248,244,234,0.6)" }}>
                                        {conversation.lastMessage || "Cached conversation available offline."}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
