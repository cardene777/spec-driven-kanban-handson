import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
 const { id } = await context.params;
 if (!await prisma.card.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "カードがありません");
 const title = titleOf(await jsonBody(request), 200);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜200文字で入力してください");
 return Response.json(await prisma.card.update({ where: { id }, data: { title } }));
}
