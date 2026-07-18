// FR-001 / FR-003 (spec/01_board.md)
import { prisma } from "../prisma";

export const boardRepository = {
  list() {
    return prisma.board.findMany({ orderBy: { createdAt: "desc" } });
  },
  findById(id: string) {
    return prisma.board.findUnique({ where: { id } });
  },
  create(title: string) {
    return prisma.board.create({ data: { title } });
  },
};
