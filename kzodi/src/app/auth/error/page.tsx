"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <div style={{ padding: "40px", fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#4A3728", background: "#FFFDF5", minHeight: "100vh" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#EF4444" }}>Authentication Error</h1>
            <p style={{ fontSize: "16px", marginBottom: "24px" }}>
                We encountered an error while trying to log you in.
            </p>
            <div style={{ background: "#FEE2E2", padding: "16px", borderRadius: "8px", display: "inline-block", marginBottom: "32px", border: "1px solid #FCA5A5" }}>
                <p style={{ margin: 0, fontWeight: "bold", fontFamily: "monospace", color: "#B91C1C", fontSize: "18px" }}>
                    Error Code: {error || "Unknown"}
                </p>
            </div>

            <div style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto", background: "#FFFFFF", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Common Fixes:</h2>
                <ul style={{ paddingLeft: "20px", lineHeight: "1.6", color: "#4B5563" }}>
                    <li><strong>OAuthCallbackError / StateCookieNotFound:</strong> Make sure you are using <b>https://www.kakoei.com</b> and NOT <b>https://kakoei.com</b>. The 'www' is required for the login cookies to match.</li>
                    <li><strong>Database Error:</strong> Our database connection may have timed out. Trying again usually works.</li>
                    <li><strong>AccessDenied:</strong> You may have cancelled the Google login window.</li>
                </ul>
            </div>

            <div style={{ marginTop: "40px" }}>
                <Link href="/" style={{ padding: "12px 24px", background: "#10B981", color: "white", textDecoration: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                    &larr; Return to Home
                </Link>
            </div>

            <p style={{ marginTop: "30px", fontSize: "13px", color: "#9CA3AF" }}>
                If you keep seeing this screen, please take a screenshot and send it to the developer.
            </p>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading error details...</div>}>
            <AuthErrorContent />
        </Suspense>
    );
}
