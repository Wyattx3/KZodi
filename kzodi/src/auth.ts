import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "./lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PostgresAdapter(pool),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 90 * 24 * 60 * 60, // 90 days
    },
    jwt: {
        maxAge: 90 * 24 * 60 * 60, // 90 days
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                maxAge: 90 * 24 * 60 * 60, // 90 days â€” persist across PWA restarts
            },
        },
    },
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            // Explicitly allow sign in to proceed, NextAuth will handle linking automatically if allowDangerousEmailAccountLinking is true.
            // When signIn returns true, NextAuth proceeds with the session generation.
            return true;
        },
        async jwt({ token, account, profile }) {
            // Always resolve the user ID from the database by email.
            // This ensures the SAME user ID is used across all devices/sessions,
            // even after database migrations (e.g. Neon â†’ Aiven).
            if (token.email) {
                try {
                    const result = await pool.query(
                        "SELECT id FROM users WHERE email = $1 LIMIT 1",
                        [token.email]
                    );
                    if (result.rows.length > 0) {
                        token.id = result.rows[0].id;
                    }
                } catch (e) {
                    console.error("Failed to resolve user ID from DB:", e);
                }
            }
            if (account && profile) {
                token.name = profile.name;
                token.email = profile.email;
                token.picture = (profile as Record<string, unknown>).picture as string;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
    pages: {
        signIn: "/",
        error: "/auth/error", // Custom error page
    },
});
