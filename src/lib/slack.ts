export async function lookupSlackUserId(email: string, token: string): Promise<string | undefined> {
  try {
    const response = await fetch("https://slack.com/api/users.lookupByEmail", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json() as { ok: boolean; user?: { id?: string }; error?: string };

    if (body.ok) return body.user?.id;
    if (body.error !== "users_not_found") console.error("Slack user lookup failed", { error: body.error });
  } catch (e) {
    console.error("Slack user lookup failed", { name: e instanceof Error ? e.name : typeof e });
  }

  return undefined;
}

/** Without a token, or when a lookup fails, the person has no Slack id and is shown by name. */
export async function withSlackIds<P extends { email: string }>(
  people: P[],
  token: string | undefined,
): Promise<(P & { slackUserId?: string })[]> {
  if (!token) return people;

  return Promise.all(people.map(async person => ({
    ...person,
    slackUserId: await lookupSlackUserId(person.email, token),
  })));
}
