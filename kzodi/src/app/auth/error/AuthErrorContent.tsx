"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorInner() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "40px", fontFamily: "var(--font-display), system-ui, sans-serif",
            color: "#4A3728", background: "#FFFDF5", minHeight: "100vh"
        }}>
            <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#EF4444", fontWeight: 800 }}>
                Something went wrong, try again
            </h1>
            <div style={{ marginTop: "24px" }}>
                <Link href="/" style={{
                    padding: "12px 24px", background: "#4A3728", color: "#FFFDF5",
                    textDecoration: "none", borderRadius: "20px", fontWeight: "bold", fontSize: "16px",
                    boxShadow: "0 4px 12px rgba(74,55,40,0.15)"
                }}>
                    Try Again
                </Link>
            </div>
        </div>
    );
}

export default function AuthErrorContent() {
    return (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading error details...</div>}>
            <AuthErrorInner />
        </Suspense>
    );
}
