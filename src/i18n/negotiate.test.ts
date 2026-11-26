import { describe, expect, it } from "vitest";

import { negotiateLocale } from "./negotiate";

describe("negotiateLocale", () => {
  it("matches tags that differ from the supported ones only by region or script", () => {
    expect(negotiateLocale("zh-Hant")).toBe("zh-TW");
    expect(negotiateLocale("zh-HK,zh;q=0.9")).toBe("zh-TW");
    expect(negotiateLocale("en-US")).toBe("en");
  });

  it("tolerates spaces and honors q-values", () => {
    expect(negotiateLocale("en-US;q=0.5, zh-TW;q=0.9")).toBe("zh-TW");
    expect(negotiateLocale("fr, zh-TW;q=0.8")).toBe("zh-TW");
  });

  it("skips malformed tags instead of discarding the whole header", () => {
    expect(negotiateLocale("zh-TW, en_US;q=0.5")).toBe("zh-TW");
    expect(negotiateLocale("zh_TW, zh;q=0.9")).toBe("zh-TW");
  });

  it("falls back to en for missing, unsupported or malformed headers", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("fr, ja;q=0.8")).toBe("en");
    expect(negotiateLocale("zh-TW;q=0")).toBe("en");
    expect(negotiateLocale("@@@")).toBe("en");
  });
});
