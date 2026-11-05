import { afterEach, describe, expect, it, vi } from "vitest";

import { lookupSlackUserId, withSlackIds } from "./slack";

const respondWith = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lookupSlackUserId", () => {
  it("sends the email in the body, not the URL", async () => {
    const fetchMock = respondWith({ ok: true, user: { id: "U1" } });
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupSlackUserId("a@example.com", "token")).resolves.toBe("U1");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://slack.com/api/users.lookupByEmail");
    expect(String(init.body)).toBe("email=a%40example.com");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token" });
  });

  it("treats an unknown email as no match without logging", async () => {
    vi.stubGlobal("fetch", respondWith({ ok: false, error: "users_not_found" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => { });

    await expect(lookupSlackUserId("a@example.com", "token")).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it("logs other Slack errors without the email", async () => {
    vi.stubGlobal("fetch", respondWith({ ok: false, error: "missing_scope" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => { });

    await expect(lookupSlackUserId("a@example.com", "token")).resolves.toBeUndefined();
    expect(JSON.stringify(log.mock.calls)).toContain("missing_scope");
    expect(JSON.stringify(log.mock.calls)).not.toContain("a@example.com");
  });

  it("survives a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("failed"); }));
    vi.spyOn(console, "error").mockImplementation(() => { });

    await expect(lookupSlackUserId("a@example.com", "token")).resolves.toBeUndefined();
  });
});

describe("withSlackIds", () => {
  const people = [{ name: "Alice", email: "a@example.com" }];

  it("does not call Slack without a token", async () => {
    const fetchMock = respondWith({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(withSlackIds(people, undefined)).resolves.toEqual(people);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds the id found by email", async () => {
    vi.stubGlobal("fetch", respondWith({ ok: true, user: { id: "U1" } }));

    await expect(withSlackIds(people, "token")).resolves.toEqual([{ ...people[0], slackUserId: "U1" }]);
  });
});
