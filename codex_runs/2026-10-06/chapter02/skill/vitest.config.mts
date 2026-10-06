// FR-COM-001, FR-COM-002, FR-COM-003, FR-COM-004
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } }, test: { environment: "node", setupFiles: ["tests/setup.ts"], fileParallelism: false } });
