import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" -> repo root alias.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
    // Resolve `server-only` to its no-op react-server entry so server modules can
    // be imported in the Node test environment.
    conditions: ["react-server", "node", "import", "default"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
