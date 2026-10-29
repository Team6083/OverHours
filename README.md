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
| `AUTH_KEYCLOAK_ROLES_CLAIM` | No | Dot-separated path of the roles array in the access token. Default: `realm_access.roles`. |
| `AUTH_SECRET` | Yes (production) | Secret Auth.js uses to sign and encrypt session cookies. Read by Auth.js itself, not by this repository's code. |
| `AUTH_URL` | No | Canonical public URL of the app. Auth.js variable; may be needed behind a reverse proxy. |
| `AUTH_TRUST_HOST` | No | Set to `true` to let Auth.js trust the `Host` header. Auth.js variable; often needed behind a reverse proxy. |
| `ADMIN_API_KEY` | For the Admin API | Bearer token accepted by `/api/admin/*`. Admin API requests are rejected when it is unset. |
| `ORG_NAME` | No | Name of the organisation running this instance. Shown in the header, footer and page description. When unset, no organisation text is shown. |
| `OVERHOURS_TIMELOG_MIN_DURATION_SEC` | No | Minimum duration in seconds for a clocked-in session; clocking out sooner deletes the log. Default: `0`. |
| `SENTRY_DSN` | No | Sentry DSN for the server and edge runtimes. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for the browser. Inlined at build time. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token used to upload source maps. Build time only; secret. |
| `NEXT_PUBLIC_VERSION` | No | Version shown in the footer badge. Inlined at build time. |
| `NEXT_PUBLIC_COMMIT_SHA` | No | Commit shown in the footer badge when no version is set. Inlined at build time. |
| `NEXT_PUBLIC_BUILD_DATE` | No | Build date shown next to the commit. Inlined at build time. |

The `AUTH_SECRET`, `AUTH_URL` and `AUTH_TRUST_HOST` rows are consumed by Auth.js directly; see the
[Auth.js deployment guide](https://authjs.dev/getting-started/deployment) for details.

<!-- Auth configuration: see PR #88; re-add after merge -->

## Build and run

```bash
npm run build   # next build (standalone output in .next/standalone)
npm run lint    # eslint
```

The build uses `output: "standalone"`, so the production server is started with `node server.js` from
the standalone output (the `Dockerfile` copies `public` and `.next/static` into it first). For local work
use `npm run dev`; running the container image is the supported way to run a production build.

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

The application is published as a container image: `ghcr.io/team6083/overhours`. Provide the environment
variables above at runtime; the container listens on port 3000.
