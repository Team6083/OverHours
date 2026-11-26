import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tapCard = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/card-dto", () => ({ tapCard }));

import { POST } from "./route";

const call = (body: unknown, key = "secret") => POST(new NextRequest("http://localhost/api/admin/cards/tap", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
}));

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "secret");
  vi.stubEnv("AUTH_URL", "https://overhours.example.test/");
  tapCard.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/cards/tap", () => {
  it("rejects a wrong key without tapping", async () => {
    expect((await call({ uid: "04A1B2C3" }, "wrong")).status).toBe(401);
    expect(tapCard).not.toHaveBeenCalled();
  });

  it("refuses a missing or malformed uid", async () => {
    for (const body of [{}, { uid: 1234 }, { uid: "not hex" }, "{"]) {
      expect((await call(body)).status).toBe(400);
    }
    expect(tapCard).not.toHaveBeenCalled();
  });

  it("taps the normalized uid and returns who was clocked in", async () => {
    tapCard.mockResolvedValue({ result: "clockedIn", user: { id: "a", name: "A" } });

    const response = await call({ uid: "04:a1:b2:c3" });

    expect(tapCard).toHaveBeenCalledWith("04A1B2C3");
    await expect(response.json()).resolves.toEqual({ data: { result: "clockedIn", user: { id: "a", name: "A" } } });
  });

  it("returns a bind link on AUTH_URL for an unbound card", async () => {
    tapCard.mockResolvedValue({ result: "unbound", code: "abc" });

    const body = await (await call({ uid: "04A1B2C3" })).json();

    expect(body).toEqual({ data: { result: "unbound", bindUrl: "https://overhours.example.test/cards/bind?code=abc" } });
  });
});
