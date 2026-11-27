import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ session: null as { user: { canTapCards?: boolean } } | null }));
const cards = vi.hoisted(() => ({ tapCard: vi.fn(), isCurrentBindCode: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/data/card-dto", () => cards);
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "kiosk.example.test", "x-forwarded-proto": "https" }) }));

import { kioskBindCodeActive, kioskTap } from "./actions";

beforeEach(() => {
  state.session = { user: { canTapCards: true } };
  cards.tapCard.mockReset();
  cards.isCurrentBindCode.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("kioskTap", () => {
  it("refuses accounts that may not tap cards, without tapping", async () => {
    for (const session of [null, { user: { canTapCards: false } }]) {
      state.session = session;
      await expect(kioskTap("04A1B2C3")).resolves.toEqual({ result: "forbidden" });
    }
    expect(cards.tapCard).not.toHaveBeenCalled();
  });

  it("refuses input that isn't a card UID", async () => {
    await expect(kioskTap("hello")).resolves.toEqual({ result: "invalid" });
    expect(cards.tapCard).not.toHaveBeenCalled();
  });

  it("shows the name for a linked card", async () => {
    cards.tapCard.mockResolvedValue({ result: "clockedIn", user: { id: "a", name: "A" } });
    await expect(kioskTap("04:a1:b2:c3")).resolves.toEqual({ result: "clockedIn", name: "A" });
    expect(cards.tapCard).toHaveBeenCalledWith("04A1B2C3");
  });

  it("builds the bind link for an unbound card from AUTH_URL, or the request host", async () => {
    cards.tapCard.mockResolvedValue({ result: "unbound", code: "abc" });
    await expect(kioskTap("04A1B2C3")).resolves.toEqual({
      result: "unbound", card: "••••B2C3", code: "abc", bindUrl: "https://kiosk.example.test/cards/bind?code=abc",
    });

    vi.stubEnv("AUTH_URL", "https://overhours.example.test/");
    await expect(kioskTap("04A1B2C3")).resolves.toMatchObject({ bindUrl: "https://overhours.example.test/cards/bind?code=abc" });
  });

  it("reports a failure instead of throwing", async () => {
    cards.tapCard.mockRejectedValue(new Error("db down"));
    await expect(kioskTap("04A1B2C3")).resolves.toEqual({ result: "failed" });
  });
});

describe("kioskBindCodeActive", () => {
  it("passes the answer through and treats errors as no longer active", async () => {
    cards.isCurrentBindCode.mockResolvedValue(true);
    await expect(kioskBindCodeActive("abc")).resolves.toBe(true);

    cards.isCurrentBindCode.mockRejectedValue(new Error("Unauthorized"));
    await expect(kioskBindCodeActive("abc")).resolves.toBe(false);
  });
});
