/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: "offline-build-assets",
      apply: "build",
      writeBundle(options, bundle) {
        const worker = resolve(options.dir ?? "dist", "sw.js");
        const assets = Object.keys(bundle).filter((name) =>
          name.startsWith("assets/"),
        );
        writeFileSync(
          worker,
          readFileSync(worker, "utf8").replace(
            "const BUILD_ASSETS = [];",
            `const BUILD_ASSETS = ${JSON.stringify(assets.map((name) => "/" + name))};`,
          ),
        );
      },
    },
  ],
  server: {
    // Allow the sandboxed preview host used for live previews.
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    // Increase chunk size warning limit to 1.2 MB to avoid noisy warnings
    chunkSizeWarningLimit: 1200,
  },
  base: "./",
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/support/setup.ts"],
  },
});
