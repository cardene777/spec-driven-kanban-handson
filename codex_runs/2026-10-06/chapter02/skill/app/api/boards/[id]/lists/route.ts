// FR-LIST-001, FR-LIST-002, FR-COM-003, FR-COM-004
import { db } from "@/lib/db";
import { readBody, validTitle, invalid, missing } from "@/lib/input";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.board.findUnique({ where: { id } }))) return missing();
 return Response.json(await db.list.findMany({ where: { boardId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.board.findUnique({ where: { id } }))) return missing();
 const title = validTitle((await readBody(request)).title, 100);
 if (title === null) return invalid(100);
 const { _max } = await db.list.aggregate({ where: { boardId: id }, _max: { order: true } });
 return Response.json(await db.list.create({ data: { title, boardId: id, order: (_max.order ?? -1) + 1 } }), { status: 201 });
}
