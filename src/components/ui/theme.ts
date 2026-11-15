import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

// Team theme on top of Chakra's defaults. Anything not defined here stays
// Chakra's default; only override a token once the team has decided on it.
// Kept self-contained so it can move into the shared team package.
// Fonts stay Chakra's system stack: no web font to load, nothing to add to font-src.

// `brand` is the primary color: use colorPalette="brand" for the app's own
// emphasis (today, the current user, primary actions) instead of naming a hue.
// The team has no brand color yet, so it points at Chakra's blue; changing
// BRAND_HUE (or replacing the scale with real values) re-colors every app.
const BRAND_HUE = "blue"
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const

const ref = (shade: string) => `{colors.${BRAND_HUE}.${shade}}`
const modes = (light: string, dark: string) => ({ value: { _light: light, _dark: dark } })

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: Object.fromEntries(SHADES.map((s) => [s, { value: ref(s) }])),
      },
    },
    semanticTokens: {
      colors: {
        // The slots every colorPalette needs, mirroring Chakra's own palettes.
        brand: {
          contrast: modes("white", "white"),
          fg: modes("{colors.brand.700}", "{colors.brand.300}"),
          subtle: modes("{colors.brand.100}", "{colors.brand.900}"),
          muted: modes("{colors.brand.200}", "{colors.brand.800}"),
          emphasized: modes("{colors.brand.300}", "{colors.brand.700}"),
          solid: modes("{colors.brand.600}", "{colors.brand.600}"),
          focusRing: modes("{colors.brand.500}", "{colors.brand.500}"),
          border: modes("{colors.brand.500}", "{colors.brand.400}"),
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
