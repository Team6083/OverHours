import { beforeEach, describe, expect, it, vi } from "vitest";

const user = vi.hoisted(() => ({ createUser: vi.fn(), updateUser: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/data/account-dto", () => ({ unlinkAccount: vi.fn() }));
vi.mock("@/lib/data/user-dto", () => ({ ...user, EmailManagedByProviderError: class extends Error {} }));

import { formSubmit } from "./actions";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("user formSubmit", () => {
  const taken = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
  const emailTaken = [expect.objectContaining({ path: ["email"], message: "Another user already has this email." })];

  it("shows an email another user has as a field error on create", async () => {
    user.createUser.mockRejectedValue(taken);
    const fields = { name: "A", email: "a@example.com" };

    const state = await formSubmit({}, form(fields));
    expect(state.issues).toEqual(emailTaken);
    expect(state.prevValues).toMatchObject(fields);
  });

  it("shows an email another user has as a field error on edit", async () => {
    user.updateUser.mockRejectedValue(taken);
    const fields = { id: "u1", name: "A", email: "a@example.com" };

    const state = await formSubmit({}, form(fields));
    expect(state.issues).toEqual(emailTaken);
    expect(state.prevValues).toMatchObject(fields);
  });

  it("still fails on other errors", async () => {
    user.createUser.mockRejectedValue(new Error("down"));
    await expect(formSubmit({}, form({ name: "A", email: "a@example.com" }))).rejects.toThrow("down");
  });
});
