// Content Security Policy for HTML responses, built per request by src/proxy.ts (see README "Security headers").

// Cloudflare Web Analytics (RUM). When enabled on the Cloudflare zone, Cloudflare injects an external
// <script src="https://static.cloudflareinsights.com/beacon.min.js"> into HTML responses (we do not add it
// ourselves) and the beacon posts to https://cloudflareinsights.com/cdn-cgi/rum.
const CLOUDFLARE_BEACON_SCRIPT_HOST = "https://static.cloudflareinsights.com";
const CLOUDFLARE_BEACON_CONNECT_HOST = "https://cloudflareinsights.com";

function originOf(url: string | undefined): string | undefined {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
}

export function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
}

let warnedAboutKeycloakOrigin = false;

export function buildCsp(options: { nonce: string; keycloakIssuer?: string; production: boolean }): string {
  const { nonce, keycloakIssuer, production } = options;
  const keycloakOrigin = originOf(keycloakIssuer);
  if (!keycloakOrigin && !warnedAboutKeycloakOrigin) {
    warnedAboutKeycloakOrigin = true;
    // Fixed message on purpose: never print the env value.
    console.warn("AUTH_KEYCLOAK_ISSUER is unset or invalid: CSP form-action falls back to 'self'; sign-in redirects may be blocked");
  }

  // No 'strict-dynamic': it makes CSP3 browsers ignore host sources, which would block the (non-nonced)
  // script Cloudflare injects. Next.js scripts are same-origin or carry the nonce, so they run either way.
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, CLOUDFLARE_BEACON_SCRIPT_HOST];
  // React uses eval() for debugging in development only.
  if (!production) scriptSrc.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    // Emotion (Chakra UI) injects <style> tags and React renders inline style attributes; neither can be nonced
    // cleanly, so inline styles are allowed (scripts stay nonce-based).
    "style-src": ["'self'", "'unsafe-inline'"],
    // https: because Keycloak `picture` claims (user avatars) can point at any host.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'"],
    // Sentry goes through the same-origin tunnel route (tunnelRoute in next.config.ts).
    "connect-src": ["'self'", CLOUDFLARE_BEACON_CONNECT_HOST],
    // Sentry Replay runs its compression worker from a blob: URL.
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Some browsers also enforce form-action on the redirect after a form POST (sign-in / sign-out go to Keycloak).
    "form-action": keycloakOrigin ? ["'self'", keycloakOrigin] : ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(" ")}`);
  if (production) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
