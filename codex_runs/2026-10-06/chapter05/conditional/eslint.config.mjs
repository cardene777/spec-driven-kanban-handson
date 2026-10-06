import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([...nextVitals,...nextTs,{files:["verification/*.cjs"],rules:{"@typescript-eslint/no-require-imports":"off"}},globalIgnores([".next/**","generated/**",".verification/**","next-env.d.ts"])]);
