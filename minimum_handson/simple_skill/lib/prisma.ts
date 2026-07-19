// FR-002 データ永続化: 生成済み Prisma Client に better-sqlite3 adapter を渡して共有する
// 接続 URL は adapter 方式で渡す（schema.prisma の datasource には url を置かない）
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// 開発時のホットリロードで複数インスタンスが生成されるのを防ぐ
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
