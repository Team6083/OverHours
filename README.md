This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Auth configuration

Sign-in uses Keycloak via Auth.js (`AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_ISSUER`).
Roles are read from the Keycloak access token, which is verified (signature via the issuer's JWKS, `iss`,
`exp`, and `azp` equal to `AUTH_KEYCLOAK_ID`) before any role is trusted.

Role settings are comma-separated lists. Realm roles are written as-is (`admin`) and client roles as
`client:role` (`overhours:manager`); a user's roles are the union of `realm_access.roles` and every
client's `resource_access.<client>.roles`.

| Variable        | Default | Meaning |
| --------------- | ------- | ------- |
| `ADMIN_ROLES`   | `admin` | Users with any of these roles are admins. Unset or blank falls back to the realm role `admin`. |
| `ALLOWED_ROLES` | unset   | If set, users with none of these roles (and who are not admins) are refused with a "No access" page. If unset, every authenticated user is allowed. Admins are always allowed. |
| `AUTH_KEYCLOAK_ALGORITHMS` | `RS256` | Accepted access token signature algorithms (comma-separated, asymmetric only: RS*/PS*/ES*/EdDSA; anything else fails at startup). |
| `AUTH_KEYCLOAK_VERIFY_GRACE_SEC` | `900` | How long a session keeps its previous role while token verification keeps failing transiently. |
| `AUTH_KEYCLOAK_ROLES_CLAIM` | unset | Legacy. When set, roles are read ONLY from this dot-separated claim path (plain role names, e.g. `resource_access.overhours.roles`), replacing the realm + client lookup above. |

If Keycloak cannot be reached to verify a token (JWKS fetch failure), the user keeps their previous role and
verification is retried (at most every 30s per server process); only an invalid token (bad signature, `iss`, `exp`, `azp`) drops roles at once. If verification keeps failing for longer than `AUTH_KEYCLOAK_VERIFY_GRACE_SEC`, it is treated as invalid too (roles dropped, `ALLOWED_ROLES` enforced).

Not verified against a real Keycloak: the sign-out cookie lookup picks the secure or plain Auth.js cookie name from
`AUTH_URL` or `x-forwarded-proto`; if neither is set correctly behind a proxy, sign-out still clears the local session
but falls back to `client_id` instead of `id_token_hint`.

Signing out also ends the Keycloak SSO session (redirect to the realm's `end_session` endpoint with
`id_token_hint` and `post_logout_redirect_uri`). The app origin (`AUTH_URL`, or the request origin) must be
listed in the Keycloak client's "Valid post logout redirect URIs".

The "No access" / sign-in error page also has a "Sign out" button (a POST server action, so a link cannot log
anyone out) that does the same without needing a session: it clears any Auth.js session cookie and ends the
Keycloak session with `client_id` instead of `id_token_hint`, so Keycloak shows its logout confirmation page. This
lets a refused user switch accounts instead of being silently signed in again. It lands on the app origin, which
is not auto-redirected to sign-in for anonymous users, so no additional redirect URI needs registering.

## Admin API

An API-key authenticated REST API is available for managing users and time logs from
external systems. Set `ADMIN_API_KEY` in the environment, then send it as a Bearer token:

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:3000/api/admin/users
```

Endpoints:

- `GET /api/admin/users` / `POST /api/admin/users`
- `GET /api/admin/users/{id}` / `PUT /api/admin/users/{id}` / `DELETE /api/admin/users/{id}`
- `GET /api/admin/timelogs` / `POST /api/admin/timelogs`
- `GET /api/admin/timelogs/{id}` / `PUT /api/admin/timelogs/{id}` / `DELETE /api/admin/timelogs/{id}`

The full OpenAPI 3.0 schema is available at [`/openapi/admin-api.json`](public/openapi/admin-api.json).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
