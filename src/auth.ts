
import NextAuth, { DefaultSession, Profile } from "next-auth";
import { DefaultJWT, getToken } from "next-auth/jwt";
import Keycloak from "next-auth/providers/keycloak";
import { createRemoteJWKSet, jwtVerify } from "jose";
import memoize from "memoize";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "./lib/prisma";
import { evaluateAccess, extractRoles, parseAdminRoles, parseRoleList } from "./lib/auth-roles";

export enum Role {
  ADMIN = "admin",
  USER = "user",
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
    // Whether `role` was derived from a signature-verified access token (false for sessions issued
    // before roles were verified, which get re-evaluated on their next use).
    rolesVerified?: boolean;

    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken?: string;
    idToken?: string;
  }
}

// Optional legacy setting: dot-separated path into the access token payload of the roles array.
// When set it REPLACES the default realm + client role lookup (as before ADMIN_ROLES existed).
const LEGACY_ROLES_CLAIM_PATH = process.env.AUTH_KEYCLOAK_ROLES_CLAIM || undefined;

// Accepted access token signature algorithms (Keycloak realms default to RS256).
const TOKEN_ALGORITHMS = parseRoleList(process.env.AUTH_KEYCLOAK_ALGORITHMS).length > 0
  ? parseRoleList(process.env.AUTH_KEYCLOAK_ALGORITHMS)
  : ["RS256"];

const CLOCK_TOLERANCE_SEC = 10;

const keycloakIssuer = () => process.env.AUTH_KEYCLOAK_ISSUER!;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

class InvalidAccessTokenError extends Error {
  code = "ACCESS_TOKEN_AZP_MISMATCH";
}

// jose errors meaning the token itself is bad. Anything else (JWKS fetch failure or timeout, network
// errors) is treated as transient: it says nothing about the token.
const INVALID_TOKEN_ERROR_CODES = new Set([
  "ACCESS_TOKEN_AZP_MISMATCH",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWT_EXPIRED",
  "ERR_JOSE_ALG_NOT_ALLOWED",
  "ERR_JOSE_NOT_SUPPORTED",
  "ERR_JWS_INVALID",
  "ERR_JWT_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
]);

// Only the error code/name is logged: error objects can carry token claims (email, sub).
const describeError = (error: unknown) =>
  (error as { code?: string } | null)?.code ?? (error as Error | null)?.name ?? "unknown";

/**
 * Verifies the access token (signature via the issuer's JWKS, `iss`, `exp`, and `azp` equal to our
 * client id) and returns the user's roles. Throws if verification fails.
 */
async function getVerifiedRoles(accessToken: string): Promise<string[]> {
  jwks ??= createRemoteJWKSet(new URL(`${keycloakIssuer()}/protocol/openid-connect/certs`));

  const { payload } = await jwtVerify(accessToken, jwks, {
    issuer: keycloakIssuer(),
    algorithms: TOKEN_ALGORITHMS,
    clockTolerance: CLOCK_TOLERANCE_SEC,
  });
  if (payload.azp !== process.env.AUTH_KEYCLOAK_ID) {
    throw new InvalidAccessTokenError("Access token was not issued to this client (azp mismatch)");
  }

  return extractRoles(payload, LEGACY_ROLES_CLAIM_PATH);
}

let warnedEmptyAdminRoles = false;

/**
 * Resolves the app role and whether the user may use the app at all.
 * An invalid token fails closed (no roles). Returns null when verification could not be performed
 * (e.g. Keycloak unreachable), in which case callers must keep the previous state and retry later.
 */
async function resolveAccess(accessToken: string): Promise<{ role: Role; allowed: boolean } | null> {
  let roles: string[];
  try {
    roles = await getVerifiedRoles(accessToken);
  } catch (error) {
    const code = describeError(error);
    if (INVALID_TOKEN_ERROR_CODES.has(code)) {
      console.error(`Access token rejected (${code}), treating user as having no roles`);
      roles = [];
    } else {
      console.error(`Could not verify access token (${code}), keeping previous roles`);
      return null;
    }
  }

  const adminRoles = parseAdminRoles(process.env.ADMIN_ROLES);
  if (!warnedEmptyAdminRoles && process.env.ADMIN_ROLES && parseRoleList(process.env.ADMIN_ROLES).length === 0) {
    warnedEmptyAdminRoles = true;
    console.warn(`ADMIN_ROLES is set but contains no roles, falling back to "${adminRoles.join(",")}"`);
  }

  const { isAdmin, allowed } = evaluateAccess(roles, adminRoles, parseRoleList(process.env.ALLOWED_ROLES));
  return { role: isAdmin ? Role.ADMIN : Role.USER, allowed };
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
    signIn: async ({ account, profile }) => {
      if (account?.provider !== 'keycloak' || !profile?.email_verified) {
        return '/auth/error?error=EmailNotVerified';
      }

      if (!account.access_token) {
        return '/auth/error?error=MissingRole';
      }

      const access = await resolveAccess(account.access_token);
      if (!access) {
        return '/auth/error?error=VerificationUnavailable';
      }
      if (!access.allowed) {
        return '/auth/error?error=MissingRole';
      }

      return true;
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

        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.rolesVerified = false;
      }

      let accessTokenChanged = !token.rolesVerified;

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
          token.idToken = tokensOrError.id_token || token.idToken;
          token.rolesVerified = false;
          accessTokenChanged = true;
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'error' in error && error.error === 'invalid_grant') {
            return null;
          }

          console.error("Error refreshing access_token", error);
        }
      }

      // Roles only change with the access token, so verify and re-derive them only when it is new
      // (sign-in, refresh) or the session predates verified roles.
      if (accessTokenChanged) {
        const access = await resolveAccess(token.accessToken);
        if (access) {
          if (!access.allowed) {
            // Lost the role required by ALLOWED_ROLES: end the session.
            return null;
          }

          token.role = access.role;
          token.rolesVerified = true;
        } else {
          // Verification unavailable: keep the previous role (least privilege if there is none) and
          // leave rolesVerified false so the next callback retries.
          token.role ??= Role.USER;
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

/**
 * Signs out of Auth.js and then ends the Keycloak SSO session by redirecting to Keycloak's
 * end_session endpoint, which sends the browser back to the app afterwards.
 * Requires the app origin to be a valid post logout redirect URI of the Keycloak client.
 */
export async function signOutAndEndKeycloakSession(): Promise<never> {
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0];
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const origin = process.env.AUTH_URL
    ? new URL(process.env.AUTH_URL).origin
    : `${forwardedProto ?? "http"}://${host}`;

  // The session cookie is named (and used as the JWT salt) differently depending on whether it is secure.
  const secureCookie = origin.startsWith("https:");
  const salt = secureCookie ? "__Secure-authjs.session-token" : "authjs.session-token";
  const token = await getToken({
    req: { headers: requestHeaders },
    secret: process.env.AUTH_SECRET,
    secureCookie,
    salt,
  });

  await signOut({ redirect: false });

  const logoutUrl = new URL(`${keycloakIssuer()}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("post_logout_redirect_uri", origin);
  if (typeof token?.idToken === "string") {
    logoutUrl.searchParams.set("id_token_hint", token.idToken);
  } else {
    // No id token (e.g. session from before it was stored): Keycloak accepts client_id instead.
    logoutUrl.searchParams.set("client_id", process.env.AUTH_KEYCLOAK_ID!);
  }

  redirect(logoutUrl.toString());
}
