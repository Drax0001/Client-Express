import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// import Email from "next-auth/providers/email";
import Email from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "../../lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Email({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
            // Fallback for development debugging
            sendVerificationRequest: process.env.NODE_ENV === "development"
                ? async ({ identifier, url }) => {
                    console.log(`[DEV MAGIC LINK] To: ${identifier} -> ${url}`);
                }
                : undefined,
        }),
    ],
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
        verifyRequest: "/login?check=1",
        error: "/login?error=1",
    },
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user?.id) token.id = user.id;
            if (user?.name) token.name = user.name;
            return token;
        },
        session: async ({ session, token }) => {
            if (session.user) {
                if (token.id) session.user.id = token.id as string;
                if (token.name) session.user.name = token.name;
            }
            return session;
        },
    },
});
