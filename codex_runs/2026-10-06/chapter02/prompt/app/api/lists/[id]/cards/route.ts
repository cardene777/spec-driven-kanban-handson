import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.list.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "リストがありません");
 return Response.json(await prisma.card.findMany({ where: { listId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.list.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "リストがありません");
 const body = await jsonBody(request), title = titleOf(body, 200);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜200文字で入力してください");
 const description = body && typeof body === "object" && "description" in body && typeof body.description === "string" ? body.description : null;
 const max = await prisma.card.aggregate({ where: { listId: id }, _max: { order: true } });
 return Response.json(await prisma.card.create({ data: { listId: id, title, description, order: (max._max.order ?? -1) + 1 } }), { status: 201 });
}
