import { describe, expect, it } from "vitest";

import { system } from "./theme";

describe("theme", () => {
  const css = JSON.stringify(system.getTokenCss());

  it("gives brand every slot a colorPalette needs", () => {
    for (const slot of ["contrast", "fg", "subtle", "muted", "emphasized", "solid", "focus-ring", "border"]) {
      expect(css).toContain(`"--chakra-colors-brand-${slot}":`);
    }
  });

  it("gives brand the full shade scale", () => {
    for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(css).toContain(`"--chakra-colors-brand-${shade}":`);
    }
  });
});
