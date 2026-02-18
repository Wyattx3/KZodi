"use client";
import React from "react";
import { motion } from "framer-motion";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

export default function ProfileTab() {
    const { data: session } = useSession();

    return (
        <div className="explore-container safe-top">
            <div className="explore-hero">
                <div className="explore-hero-content">
                    <motion.h1
                        className="explore-hero-title"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        Profile
                    </motion.h1>
                    <motion.p
                        className="explore-hero-subtitle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Your identity and settings
                    </motion.p>
                </div>
            </div>

            <motion.div
                className="explore-section"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "32px 0" }}>
                    {session?.user ? (
                        <>
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                                {session.user.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-3xl">
                                        {session.user.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="explore-section-title" style={{ textAlign: "center", fontSize: "20px" }}>
                                    {session.user.name}
                                </h3>
                                <p className="chats-header-sub" style={{ textAlign: "center" }}>
                                    {session.user.email}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="chat-landing-btn"
                                style={{
                                    marginTop: "16px",
                                    width: "100%",
                                    background: "#FFE566",
                                    color: "#111",
                                    border: "none"
                                }}
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "50%",
                                backgroundColor: "#E5E7EB",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "32px"
                            }}>
                                👤
                            </div>
                            <div>
                                <h3 className="explore-section-title" style={{ textAlign: "center", fontSize: "20px" }}>
                                    Guest User
                                </h3>
                                <p className="chats-header-sub" style={{ textAlign: "center" }}>
                                    Sign in to sync your chats
                                </p>
                            </div>

                            <button
                                onClick={() => signIn("google")}
                                className="chat-landing-btn"
                                style={{ marginTop: "16px", width: "100%" }}
                            >
                                Sign In with Google
                            </button>
                        </>
                    )}
                </div>

                <div className="chats-list">
                    <div className="chats-item" style={{ background: "#FFFFFF", border: "1px solid #F3F4F6" }}>
                        <div className="chats-item-info">
                            <span className="chats-item-name" style={{ fontSize: "15px" }}>Appearance</span>
                        </div>
                        <span className="chats-item-time">Light Mode</span>
                    </div>
                    <div className="chats-item" style={{ background: "#FFFFFF", border: "1px solid #F3F4F6" }}>
                        <div className="chats-item-info">
                            <span className="chats-item-name" style={{ fontSize: "15px" }}>Language</span>
                        </div>
                        <span className="chats-item-time">English</span>
                    </div>
                    <div className="chats-item" style={{ background: "#FFFFFF", border: "1px solid #F3F4F6" }}>
                        <div className="chats-item-info">
                            <span className="chats-item-name" style={{ fontSize: "15px" }}>App Version</span>
                        </div>
                        <span className="chats-item-time">v1.2.0</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
