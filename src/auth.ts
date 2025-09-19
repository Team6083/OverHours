
import NextAuth, { DefaultSession } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

import prisma from "./lib/prisma";

export enum Role {
  ADMIN,
  USER,
}

declare module "next-auth" {
  interface Session {
    user: {
      role: Role;
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
            name: (() => {
              const familyName = profile?.family_name;
              const givenName = profile?.given_name;

              if (familyName && givenName) {
                // Check if family name contains Chinese characters
                const chineseRegex = /[\u4e00-\u9fff]/;
                if (chineseRegex.test(familyName)) {
                  return `${familyName}${givenName}`;
                } else {
                  return `${givenName} ${familyName}`;
                }
              }

              return user.name || `kc-${account.providerAccountId}`;
            })(),
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

          console.log('Profile:', profile);

          if (profile && Array.isArray(profile.roles)) {
            const roles = profile.roles;

            if (roles.includes('admin')) {
              token.role = "admin";
            }
          }
        }
      }

      return token;
    },
    session({ session, token }) {
      if ('id' in token && typeof token.id === 'string') {
        session.user.id = token.id.toString();

        if ('role' in token && typeof token.role === 'string' && token.role === 'admin') {
          session.user.role = Role.ADMIN;
        } else {
          session.user.role = Role.USER;
        }
      }
      return session;
    },
  },
});
