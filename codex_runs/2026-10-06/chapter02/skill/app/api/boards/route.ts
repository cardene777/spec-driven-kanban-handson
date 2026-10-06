// FR-BOARD-001, FR-BOARD-002, FR-COM-003
import { db } from "@/lib/db";
import { readBody, validTitle, invalid } from "@/lib/input";
export async function GET() { return Response.json(await db.board.findMany({ orderBy: { createdAt: "desc" } })); }
export async function POST(request: Request) {
 const body = await readBody(request), title = validTitle(body.title, 100);
 if (title === null) return invalid(100);
 return Response.json(await db.board.create({ data: { title } }), { status: 201 });
}
