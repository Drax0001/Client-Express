import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "../../lib/prisma";

const emailServer = process.env.EMAIL_SERVER;
const emailFrom = process.env.EMAIL_FROM;
const useConsoleEmail = !emailServer || !emailFrom;
const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "development" ? "dev-secret-change-me" : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  providers: [
    Email({
      server: emailServer ?? { jsonTransport: true },
      from: emailFrom ?? "dev@localhost",
      sendVerificationRequest: useConsoleEmail
        ? async ({ identifier, url }) => {
            console.log(`Magic link for ${identifier}: ${url}`);
          }
        : undefined,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=1",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.name) {
        token.name = user.name;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.name = token.name ?? session.user.name ?? null;
      }
      return session;
    },
  },
});
