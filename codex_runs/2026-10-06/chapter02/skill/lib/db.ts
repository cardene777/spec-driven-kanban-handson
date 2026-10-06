// FR-COM-001
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const scope = globalThis as unknown as { kanbanDb?: PrismaClient };
export const db = scope.kanbanDb ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });
if (process.env.NODE_ENV !== "production") scope.kanbanDb = db;
