// design/006_label.md § セキュリティ = 一意制約違反 (P2002) の集約変換 SSOT
import { Prisma } from "@prisma/client";

// Prisma の一意制約違反 (P2002) を判定する。
export function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}
