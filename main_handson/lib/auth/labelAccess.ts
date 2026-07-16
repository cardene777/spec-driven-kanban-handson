// design/006_label.md § 補助クエリ = labelId → boardId 解決 SSOT
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/http/errors";

export async function resolveBoardFromLabel(
  labelId: string,
): Promise<{ id: string; boardId: string }> {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    select: { id: true, boardId: true },
  });
  if (!label) throw new NotFoundError();
  return label;
}
