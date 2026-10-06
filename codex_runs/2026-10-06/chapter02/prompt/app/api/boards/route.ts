import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
export async function GET() {
 return Response.json(await prisma.board.findMany({ orderBy: { createdAt: "desc" } }));
}
export async function POST(request: Request) {
 const title = titleOf(await jsonBody(request), 100);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜100文字で入力してください");
 return Response.json(await prisma.board.create({ data: { title } }), { status: 201 });
}
