import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
      if (token?.name) {
        session.user.name = token.name;
      }
      return session;
    },
    signIn: async ({ user, account }) => {
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });
        if (existingUser) {
          // Check if Google account is already linked
          const existingGoogleAccount = existingUser.accounts.find(
            (acc) => acc.provider === "google"
          );
          if (existingGoogleAccount) {
            return true; // Already linked
          }
          // Link the Google account to the existing user
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token ? String(account.id_token) : null,
              session_state: account.session_state,
            },
          });
          return true;
        }
      }
      return true;
    },
  },
});
