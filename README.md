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
| `AUTO_LOCK_TIME` | No | Daily cut-off as `HH:mm` in `TZ`. Sessions still clocked in at the cut-off are locked as abnormal clock-outs; see [Auto-lock](#auto-lock). Unset: no automatic locking. A malformed value stops the server from starting. |
| `TZ` | No | IANA time zone (e.g. `Asia/Taipei`) of the server, used for `AUTO_LOCK_TIME` and for times in locked-log reports and CSV exports. Default: the container's zone, usually UTC, so set it whenever auto-lock is enabled. An invalid zone stops the server from starting. |
| `SENTRY_DSN` | No | Sentry DSN for the server and edge runtimes. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for the browser. Inlined at build time. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token used to upload source maps. Build time only; secret. |
| `NEXT_PUBLIC_VERSION` | No | Version shown in the footer badge. Inlined at build time. |
| `NEXT_PUBLIC_COMMIT_SHA` | No | Commit shown in the footer badge when no version is set. Inlined at build time. |
| `NEXT_PUBLIC_BUILD_DATE` | No | Build date shown next to the commit. Inlined at build time. |
| `CSP_REPORT_ONLY` | No | Set to `true` to send the CSP as `Content-Security-Policy-Report-Only` (violations are logged in the browser console, nothing is blocked). See [Security headers](#security-headers). |

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

## Testing

```bash
npm test   # vitest run
```

Unit tests use [Vitest](https://vitest.dev) and live next to the code as `src/**/*.test.ts` (configured in
`vitest.config.mts`). They cover pure logic only (no database or Keycloak needed), for example the role
parsing in `src/lib/auth-roles.ts` and the token error classification in `src/lib/auth-errors.ts`.
CI runs `npm test` in the `check` job.

## Auth configuration

Sign-in uses Keycloak via Auth.js (`AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_ISSUER`).
Roles are read from the Keycloak access token, which is verified (signature via the issuer's JWKS, `iss`,
`exp`, and `azp` equal to `AUTH_KEYCLOAK_ID`) before any role is trusted.

Users are matched to the accounts they sign in with (an `Account` per Auth.js provider id and OIDC `sub`), not by
email, so changing the email in Keycloak keeps the same user and updates their email here. A user without an
account yet (created before accounts existed, or by an admin) is linked on their first sign-in with the same email.
If that email belongs to a user already linked to another account, the sign-in is refused with an "Account
conflict" page; an admin resolves it by unlinking the old account on the user's page, or by merging. When a user's
new email is already taken by another user, their old email is kept and the users list marks them "Out of sync"
until an admin merges them.

Merging moves every linked account to the kept user. The email of a user with exactly one account follows that
account and cannot be edited in the app or the Admin API; a user with several accounts keeps their email until an
admin edits it, so it does not switch with every sign-in.

Accounts are keyed by the provider id (`keycloak`), not the issuer URL, because Keycloak keeps `sub` when its
hostname or realm name changes: changing `AUTH_KEYCLOAK_ISSUER` for such a move needs no data change (the issuer
stored on each account is for reference and updates at the next sign-in). Moving to a different Keycloak instance
or realm whose users have new IDs changes every `sub`, so no sign-in would match and every user would hit "Account
conflict". In that case remove the old links before switching, so each user is linked again by email at their next
sign-in (a user whose email differs between the two systems gets a new user, to merge afterwards):

```js
// mongosh, against DATABASE_URL
db.Account.deleteMany({ provider: "keycloak" })
```

Run `npx prisma db push` once after deploying so the `Account` indexes exist.

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

## Security headers

Every response carries (set in `next.config.ts`, so API routes, static assets, error pages and the health endpoints included):

| Header | Value |
| --- | --- |
| `X-App-Version` | `NEXT_PUBLIC_VERSION` (the git tag, e.g. `v2.1.0`) |
| `X-App-Commit` | `NEXT_PUBLIC_COMMIT_SHA` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

`X-App-*` values are fixed at build time from the Docker build args and intentionally disclose the build (version and commit) on every response, as the team standard requires; a header whose value was not set (local development) is omitted. HSTS is not set by the app; set it at the edge.

HTML responses also get a per-request `Content-Security-Policy` with a fresh nonce, built in `src/lib/csp.ts` and set by `src/proxy.ts` (pages are rendered dynamically, which nonces require). Scripts are limited to `'self'`, the nonce and the Cloudflare beacon host; `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action` allows `'self'` and the Keycloak origin from `AUTH_KEYCLOAK_ISSUER`. `'unsafe-eval'` is added outside production only and `upgrade-insecure-requests` in production only (so a production build served over plain `http://` needs `CSP_REPORT_ONLY=true`). Notes:

- `'strict-dynamic'` is deliberately not used: it makes browsers ignore host sources, which would block the script Cloudflare injects (it has no nonce).
- Cloudflare Web Analytics: `https://static.cloudflareinsights.com` is allowed in `script-src` and `https://cloudflareinsights.com` in `connect-src` (constants at the top of `src/lib/csp.ts`). Any other inline script Cloudflare injects (for example Rocket Loader) cannot carry our nonce and is blocked.
- `style-src` allows `'unsafe-inline'`: Chakra UI/emotion inject `<style>` tags and inline style attributes that cannot be nonced cleanly.
- `img-src` allows `https:` because user avatars come from the Keycloak `picture` claim. Sentry uses the same-origin tunnel route, so it needs no extra host.
- To roll out or debug, set `CSP_REPORT_ONLY=true`: the same policy is sent as `Content-Security-Policy-Report-Only`, which does not block anything. The value must be exactly the string `true` (`TRUE` or `1` enforce the policy). `docker-compose.yaml` sets it because it serves the production build over plain `http://localhost`.

## Health checks

| Endpoint | Purpose | Behaviour |
| --- | --- | --- |
| `GET /api/healthz` | Liveness | Always `200 {"status":"ok"}` while the process runs. No dependency checks. |
| `GET /api/readyz` | Readiness | `200 {"status":"ok"}` when MongoDB answers a ping within 800 ms; otherwise `503` (`{"status":"unavailable"}`, or `{"status":"shutting_down"}` after SIGTERM). |

Both endpoints are unauthenticated, return JSON without internal details and are sent with `Cache-Control: no-store`. The MongoDB check is shared between concurrent requests and its result is cached for 2 seconds per process. The 800 ms ping timeout is deliberately below the Kubernetes default probe `timeoutSeconds` of 1.

On Kubernetes, use `/api/healthz` for the liveness probe and `/api/readyz` for the readiness probe.

On `SIGTERM`, Next.js's standalone server stops accepting new connections, lets in-flight requests finish and exits (code 143). Readiness probes therefore mostly fail by connection refusal, and `/api/readyz` only reports `shutting_down` on connections that are still open during the drain. Add a `preStop` sleep of a few seconds so the pod is removed from the Service endpoints before it stops accepting connections, and set `terminationGracePeriodSeconds` longer than that sleep plus your longest request. If `NEXT_MANUAL_SIG_HANDLE` is set, the shutdown flag is not installed and `/api/readyz` never reports `shutting_down`.

## Auto-lock

A session that is not clocked out normally is **locked**: it gets status `LOCKED`, does not count toward
hours, and appears in the Locked Logs report. Admins can lock a session by hand (Lock on the home page,
or setting the status in the log editor / Admin API). With `AUTO_LOCK_TIME` set, a session may
not span the daily cut-off: with `23:00`, a session started at 22:30 must end by 23:00 that day, and one
started at 23:30 by 23:00 the next day. A session that passed its cut-off is locked at the cut-off (its out
time is the cut-off).

The app checks this only at clock-out: clocking out (or an admin clocking someone out) after the cut-off
locks the session instead and tells the user. A session whose user never clocks out stays "currently in"
until something locks it, so run a scheduler (for example a Kubernetes CronJob) that calls the Admin API
regularly, e.g. every few minutes:

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" https://overhours.example.com/api/admin/jobs/auto-lock
# {"data":{"enabled":true,"lockedCount":1,"lockedIds":["..."]}}
```

It locks every session past its cut-off and is safe to call as often as wanted. Each lock records a reason
(`AUTO_TIMEOUT` or `ADMIN`), when it happened and, for locks made in the web UI, which admin made it. Logs
locked before this was recorded show the reason as unknown.

Locked logs can be exported for violation records as CSV from **Report → Locked Logs** (admins; dates are
whole days in `TZ`), or through `GET /api/admin/timelogs/locked` (JSON or `format=csv`).

## Attendance

Members answer each day on `/attendance` with one of three answers, and can clear a day back to not filled in:

| Answer | Meaning | Stored as |
| --- | --- | --- |
| Will come | Promised to be there | `WillCome` |
| If needed | Can be there if asked | `Available` |
| Can't come | Away | `Unavailable` |
| Not filled | No answer; **not** the same as will come | no row |

Past days cannot be changed. Every member can see who gave each answer on each day; people who have not filled
it in are not listed. Rows saved before "will come" existed keep `Available` and show as if needed.

Run `npx prisma db push` once after deploying so the unique index exists and the `WillCome` value is accepted. Set `TZ`, because "today" is worked
out in that zone.

External programs, such as a Slack bot, read everyone's status through the Admin API:

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" "https://overhours.example.com/api/admin/attendance?start=2027-01-11&end=2027-01-17"
# {"data":{"start":"2027-01-11","end":"2027-01-17","users":[{"id":"...","name":"...","email":"...","days":[{"date":"2027-01-11","status":"AVAILABLE"}]}]}}
```

`status` is `AVAILABLE`, `UNAVAILABLE` or `NOT_FILLED`; "will come" is reported as `AVAILABLE` for now, so
existing clients see no new value. A request covers at most 92 days.

## Teams

Admins manage teams on `/admin/teams`. Teams form a tree: a team can have sub-teams, and a team that still has
sub-teams cannot be deleted. Members of a sub-team also count as members of every team above it: a team's member
list and member count include its sub-teams' members, who are managed (and removed) on their own sub-team. A
member's teams are shown on the home page; only the teams they are directly in are listed there.

A team can list **auto-join roles**, in the same syntax as `ADMIN_ROLES` (`role` for a realm role, `client:role`
for a client role). A user with any of them joins the team, and leaves it when they no longer have any. Roles are
read from the verified access token at sign-in and on every token refresh, so a role change in Keycloak reaches an
active user within one access token lifetime and other users at their next sign-in. Changing a team's roles works
the same way: nobody is added or removed until they next sign in or refresh.

Members added by hand are never removed by roles, even when they have none of the team's roles. A member who
joined by role is marked "Role". Admins can still remove them by hand, for example someone who left long ago and
never signs in again (role memberships are only updated at sign-in, so removing their role in Keycloak alone does
not take them off the team). If they still have the role, they rejoin at their next sign-in or token refresh; to
keep them out, remove the role in Keycloak or from the team as well. When users are merged, the admin chooses
which of their teams the kept user stays in; each kept team keeps how it was joined (by hand or by role).

The roles must be in the access token, which they are by default (`realm_access` and `resource_access`). Run
`npx prisma db push` once after deploying.

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
- `GET /api/admin/timelogs/locked` — locked logs with user details, filtered by clock-in time; `?format=csv` for CSV
- `POST /api/admin/jobs/auto-lock` — lock every session past the daily cut-off; for an external scheduler
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
