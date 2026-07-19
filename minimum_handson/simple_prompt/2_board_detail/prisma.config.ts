import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
// migrate dev は CWD 基準で解決されるため、"file:./dev.db" が来た場合は
// prisma/dev.db に統一する（.env は "file:./dev.db" のままでよい）
const url = rawUrl === "file:./dev.db" ? "file:./prisma/dev.db" : rawUrl;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: { url },
});
