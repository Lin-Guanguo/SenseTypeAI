import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "raycast-test-api",
      enforce: "pre",
      // Raycast supplies this module at runtime; tests provide their own mock.
      resolveId: (id) => (id === "@raycast/api" ? id : undefined),
    },
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/index.tsx"],
    },
  },
});
