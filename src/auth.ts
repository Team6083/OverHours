
import NextAuth, { DefaultSession, Profile } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
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

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string;
    role: string;
  }
}

function getNameFromProfile(profile: Profile): string | undefined {
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

  return profile.name || undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Keycloak],
  session: {
    maxAge: 3 * 24 * 60 * 60, // 3 days
  },
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
            name: (profile && getNameFromProfile(profile)) || user.name || user.email,
            image: profile?.picture || user.image || undefined,
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
          token.userId = dbUser.id;

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
    session({ session, token, trigger }) {
      if (trigger === "update") {
        console.log({ session, token });
      }

      if ('userId' in token && typeof token.userId === 'string') {
        session.user.id = token.userId;

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
