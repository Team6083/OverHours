
import NextAuth, { DefaultSession, Profile } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import Keycloak from "next-auth/providers/keycloak";
import memoize from "memoize";

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

    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken?: string;
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

const refreshAccessToken = memoize(async (refreshToken: string) => {
  const response = await fetch(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.AUTH_KEYCLOAK_ID!,
      client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  const tokensOrError = await response.json();
  if (!response.ok) throw tokensOrError;

  return tokensOrError;
}, {
  maxAge: 5 * 1000, // 5 seconds
});

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
        if (account?.provider !== 'keycloak') {
          throw new Error('Unsupported account provider');
        }

        if (!user.email) {
          throw new Error('Missing email');
        }

        if (!account.access_token || !account.expires_at) {
          throw new Error('Missing access token or expiration time');
        }

        const userProps = {
          name: (profile && getNameFromProfile(profile)) || user.name || user.email,
          image: profile?.picture || user.image || null,
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

        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at;
        token.refreshToken = account.refresh_token;
      }

      if (token.accessTokenExpiresAt && Date.now() / 1000 > token.accessTokenExpiresAt) {
        // Access token has expired

        if (!token.refreshToken) {
          return null;
        }

        // Refresh the access token
        try {
          const tokensOrError = await refreshAccessToken(token.refreshToken);

          token.accessToken = tokensOrError.access_token;
          token.accessTokenExpiresAt = Math.floor(Date.now() / 1000 + tokensOrError.expires_in);
          token.refreshToken = tokensOrError.refresh_token || token.refreshToken;
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'error' in error && error.error === 'invalid_grant') {
            return null;
          }

          console.error("Error refreshing access_token", error);
          return null;
        }
      }

      return token;
    },
    session({ session, token }) {
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
