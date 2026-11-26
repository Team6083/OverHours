import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            // Node built-ins and third-party packages
            ["builtin", "external"],
            // UI libraries (filled by the pathGroup below; nothing else lands here
            // because @/ imports are reassigned to the next group)
            "internal",
            // Internal imports (@/ aliases first, then relative paths)
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            { pattern: "{@chakra-ui/**,react-icons/**,@team6083/ui}", group: "internal" },
            { pattern: "@/**", group: "parent", position: "before" },
          ],
          // Default excludes "external", which would stop the UI pathGroup from matching
          pathGroupsExcludedImportTypes: ["builtin"],
          // Keep "@/" in the same block as relative imports instead of its own sub-group
          distinctGroup: false,
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          named: true,
        },
      ],
    },
  },
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
