import { PrismaClient } from "@prisma/client";

// Next.jsの開発時はホットリロードでモジュールが再評価されるため、
// グローバルに保持してPrismaClientのインスタンスが増殖するのを防ぐ。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
