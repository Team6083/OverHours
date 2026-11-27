import { describe, expect, it } from "vitest";

import { maskUid, normalizeUid } from "./cards";

describe("normalizeUid", () => {
  it("accepts hex in any case, split by spaces, colons or dashes", () => {
    expect(normalizeUid("04a1b2c3d4e5f6")).toBe("04A1B2C3D4E5F6");
    expect(normalizeUid(" 04:A1:B2:C3 ")).toBe("04A1B2C3");
    expect(normalizeUid("04 a1-b2 c3")).toBe("04A1B2C3");
  });

  it("keeps a decimal number from a reader as it is, even an odd number of digits", () => {
    expect(normalizeUid("12345678901")).toBe("12345678901");
    expect(normalizeUid(" 1234567890 ")).toBe("1234567890");
  });

  it("refuses anything that isn't 4 to 10 whole bytes of hex or 8 to 20 digits", () => {
    for (const bad of ["", "04A1B2", "04A1B2C3D", "ZZA1B2C3", "04A1B2C3D4E5F6A7B8C9D0E1", "1234567", "123456789012345678901"]) {
      expect(normalizeUid(bad)).toBeNull();
    }
  });
});

describe("maskUid", () => {
  it("keeps only the last four characters", () => {
    expect(maskUid("04A1B2C3D4E5F6")).toBe("••••E5F6");
  });
});
