import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn() {
            // Auto-create account on first sign-in (no separate signup needed)
            return true;
        },
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.id = profile.sub;
                token.name = profile.name;
                token.email = profile.email;
                token.picture = (profile as Record<string, unknown>).picture as string;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
    pages: {
        signIn: "/",
    },
});
