import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

/**
 * NextAuth configuration for Naberza OS.
 *
 * Auth strategy: single-user credentials (email + password).
 * Phase 1 will connect this to the Prisma adapter and real DB.
 * For now, credentials are validated against environment variables
 * so the app can run without a database.
 *
 * To add: PrismaAdapter, email magic links, OAuth providers.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@naberza.local",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const adminEmail = process.env.AUTH_ADMIN_EMAIL;
        const adminPassword = process.env.AUTH_ADMIN_PASSWORD;

        // No admin credentials configured — deny all
        if (!adminEmail || !adminPassword) {
          console.warn("[Auth] AUTH_ADMIN_EMAIL or AUTH_ADMIN_PASSWORD not set");
          return null;
        }

        if (
          credentials.email === adminEmail &&
          credentials.password === adminPassword
        ) {
          const user = await prisma.user.upsert({
            where: { email: adminEmail },
            update: { name: "Admin" },
            create: {
              email: adminEmail,
              name: "Admin",
            },
            select: { id: true, name: true, email: true },
          });

          return {
            id: user.id,
            name: user.name ?? "Admin",
            email: user.email,
          };
        }

        return null;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
