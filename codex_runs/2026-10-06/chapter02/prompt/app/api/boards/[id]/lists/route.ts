import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.board.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "ボードがありません");
 return Response.json(await prisma.list.findMany({ where: { boardId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.board.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "ボードがありません");
 const title = titleOf(await jsonBody(request), 100);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜100文字で入力してください");
 const max = await prisma.list.aggregate({ where: { boardId: id }, _max: { order: true } });
 return Response.json(await prisma.list.create({ data: { boardId: id, title, order: (max._max.order ?? -1) + 1 } }), { status: 201 });
}
