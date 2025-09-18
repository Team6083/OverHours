
import NextAuth, { DefaultSession } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

import prisma from "./lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Keycloak],
  callbacks: {
    signIn: ({ account, profile }) => {
      if (account?.provider === 'keycloak' && profile?.email_verified) {
        return true;
      }

      return '/auth/error?error=EmailNotVerified';
    },
    async jwt({
      token, user, account, profile, trigger,
    }) {
      if (trigger === 'signIn') {
        if (account?.provider === 'keycloak' && user.email) {
          const userProps = {
            name: user.name ?? `kc-${account.providerAccountId}`,
          };

          const dbUser = await prisma.user.upsert({
            where: {
              email: user.email,
            },
            create: {
              email: user.email,
              ...userProps,
            },
            update: userProps,
          });

          token.id = dbUser.id;

          if (profile && Array.isArray(profile.roles)) {
            const roles = profile.roles;

            if (roles.includes('admin')) {
              token.role = 'admin';
            } else if (roles.includes('course-admin')) {
              token.role = 'course-admin';
            } else if (roles.includes('user')) {
              token.role = 'user';
            }
          }
        }
      }

      return token;
    },
    session({ session, token }) {
      if ('id' in token && typeof token.id === 'string') {
        session.user.id = token.id.toString();
      }
      return session;
    },
  },
});
