import { headers } from "next/headers";

import { betterAuth } from "better-auth";
import { genericOAuth, keycloak } from "better-auth/plugins";

export enum Role {
  ADMIN = "admin",
  USER = "user",
}

const keycloakClientId = process.env.BETTER_AUTH_KEYCLOAK_ID;
const keycloakClientSecret = process.env.BETTER_AUTH_KEYCLOAK_SECRET;
const keycloakIssuer = process.env.BETTER_AUTH_KEYCLOAK_ISSUER;

if (!keycloakClientId || !keycloakClientSecret || !keycloakIssuer) {
  throw new Error("Missing Keycloak configuration in environment variables.");
}

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: keycloakClientId,
          clientSecret: keycloakClientSecret,
          issuer: keycloakIssuer,
        })
      ]
    })
  ]
});

export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
