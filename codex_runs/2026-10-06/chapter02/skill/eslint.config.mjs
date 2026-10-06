// FR-COM-001: 生成されたClientは検証対象コードから除外する。
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTypescript, globalIgnores([".next/**", "generated/**", "next-env.d.ts"])]);
