# OverHours

OverHours is a web application for tracking lab hours. Members sign in through Keycloak (SSO) and log
the time they spend in the lab; admins manage users, teams and statistics ranges and generate reports.
An API-key authenticated Admin API allows external systems to manage users and time logs.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, `standalone` output) with React and TypeScript
- [Chakra UI](https://chakra-ui.com) v3 for the interface and [next-intl](https://next-intl.dev) for i18n (`messages/`)
- [Auth.js](https://authjs.dev) (`next-auth`) with the Keycloak provider
- [Prisma](https://www.prisma.io) with MongoDB
- [Sentry](https://sentry.io) for error reporting

## Local development

Requirements: a Node.js version matching the `engines` field in `package.json`, and a MongoDB instance.

1. Install dependencies: `npm install`
2. Create a `.env` file (it is git-ignored) with at least the required variables listed
   [below](#environment-variables).
3. Generate the Prisma client and start the dev server:

   ```bash
   npx prisma generate
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

`docker-compose.yaml` only builds and runs the application image (`app`, port 3000, `NODE_ENV=production`).
It does not include a database yet, so MongoDB must be provided separately and `DATABASE_URL` pointed at
it. The `Dockerfile` reads the Sentry auth token from a `sentry-auth-token` build secret (for example
`docker build --secret id=sentry-auth-token,env=SENTRY_AUTH_TOKEN .`). `docker-compose.yaml` declares that
secret but does not wire it into the `app` build, so builds through compose do not upload source maps.

## Environment variables

Variables are read at runtime unless noted otherwise.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB connection string used by Prisma. |
| `AUTH_KEYCLOAK_ISSUER` | Yes | Keycloak realm issuer URL. |
| `AUTH_KEYCLOAK_ID` | Yes | Keycloak client ID. |
| `AUTH_KEYCLOAK_SECRET` | Yes | Keycloak client secret. |
| `AUTH_SECRET` | Yes (production) | Secret Auth.js uses to sign and encrypt session cookies. |
| `AUTH_URL` | No | Canonical public URL of the app. Also used by sign-out to build the origin; may be needed behind a reverse proxy. |
| `AUTH_TRUST_HOST` | No | Set to `true` to let Auth.js trust the `Host` header. Auth.js variable, not read by this repository's code; often needed behind a reverse proxy. |
| `ADMIN_ROLES`, `ALLOWED_ROLES`, `AUTH_KEYCLOAK_ALGORITHMS`, `AUTH_KEYCLOAK_VERIFY_GRACE_SEC`, `AUTH_KEYCLOAK_ROLES_CLAIM` | No | Role and token verification settings; see [Auth configuration](#auth-configuration). |
| `NEXT_MANUAL_SIG_HANDLE` | No | Disables the shutdown flag used by `/api/readyz`; see [Health checks](#health-checks). |
| `ADMIN_API_KEY` | For the Admin API | Bearer token accepted by `/api/admin/*`. Admin API requests are rejected when it is unset. |
| `ORG_NAME` | No | Name of the organisation running this instance. Shown in the header, footer and page description. When unset, no organisation text is shown. |
| `OVERHOURS_TIMELOG_MIN_DURATION_SEC` | No | Minimum duration in seconds for a clocked-in session; clocking out sooner deletes the log. Default: `0`. |
| `SENTRY_DSN` | No | Sentry DSN for the server and edge runtimes. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for the browser. Inlined at build time. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token used to upload source maps. Build time only; secret. |
| `NEXT_PUBLIC_VERSION` | No | Version shown in the footer badge. Inlined at build time. |
| `NEXT_PUBLIC_COMMIT_SHA` | No | Commit shown in the footer badge when no version is set. Inlined at build time. |
| `NEXT_PUBLIC_BUILD_DATE` | No | Build date shown next to the commit. Inlined at build time. |

`AUTH_SECRET` and `AUTH_TRUST_HOST` are Auth.js settings; see the
[Auth.js deployment guide](https://authjs.dev/getting-started/deployment) for details.

## Build and run

```bash
npm run build   # next build (standalone output in .next/standalone)
npm run lint    # eslint
```

The build uses `output: "standalone"`, so the production server is started with `node server.js` from
the standalone output (the `Dockerfile` copies `public` and `.next/static` into it first). For local work
use `npm run dev`; running the container image is the supported way to run a production build.

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

## Health checks

| Endpoint | Purpose | Behaviour |
| --- | --- | --- |
| `GET /api/healthz` | Liveness | Always `200 {"status":"ok"}` while the process runs. No dependency checks. |
| `GET /api/readyz` | Readiness | `200 {"status":"ok"}` when MongoDB answers a ping within 800 ms; otherwise `503` (`{"status":"unavailable"}`, or `{"status":"shutting_down"}` after SIGTERM). |

Both endpoints are unauthenticated, return JSON without internal details and are sent with `Cache-Control: no-store`. The MongoDB check is shared between concurrent requests and its result is cached for 2 seconds per process. The 800 ms ping timeout is deliberately below the Kubernetes default probe `timeoutSeconds` of 1.

On Kubernetes, use `/api/healthz` for the liveness probe and `/api/readyz` for the readiness probe.

On `SIGTERM`, Next.js's standalone server stops accepting new connections, lets in-flight requests finish and exits (code 143). Readiness probes therefore mostly fail by connection refusal, and `/api/readyz` only reports `shutting_down` on connections that are still open during the drain. Add a `preStop` sleep of a few seconds so the pod is removed from the Service endpoints before it stops accepting connections, and set `terminationGracePeriodSeconds` longer than that sleep plus your longest request. If `NEXT_MANUAL_SIG_HANDLE` is set, the shutdown flag is not installed and `/api/readyz` never reports `shutting_down`.

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

## Deployment

The application is published as a container image: `ghcr.io/team6083/overhours` (based on `node:26-alpine`).

Image tags:

| Trigger | Tags |
| --- | --- |
| Push to `main` | `main`, `sha-<7 chars>` |
| Release tag `vX.Y.Z` | `X.Y.Z` (no leading `v`), `X.Y`, `latest` |

Pin deployments to `X.Y.Z` (or the commit `sha-` tag); `latest` and `X.Y` are moving tags.
Existing `vX.Y.Z` tags remain available.

Pre-release tags (`vX.Y.Z-rc.1`) get only the full version tag (`X.Y.Z-rc.1`): no `X.Y` and no `latest`.

`latest` and `X.Y` point at whichever release was published last, so releases must be tagged in version
order; tagging a backport (e.g. `v2.0.12` after `v3.0.0`) or re-running an old tag moves them backwards,
and the maintainer must then re-tag `latest`/`X.Y` manually.
Provide the environment variables above at runtime; the container listens on port 3000 and runs as the
non-root user `65532:65532`. App files are root-owned and read-only for that user; the only directory
the Dockerfile makes writable is `.next/cache` (Next.js runtime cache).
