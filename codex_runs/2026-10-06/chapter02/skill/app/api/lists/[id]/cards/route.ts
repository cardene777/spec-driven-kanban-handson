// FR-CARD-001, FR-CARD-002, FR-COM-003, FR-COM-004
import { db } from "@/lib/db";
import { readBody, validTitle, invalid, missing } from "@/lib/input";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.list.findUnique({ where: { id } }))) return missing();
 return Response.json(await db.card.findMany({ where: { listId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.list.findUnique({ where: { id } }))) return missing();
 const body = await readBody(request), title = validTitle(body.title, 200);
 if (title === null) return invalid(200);
 const description = typeof body.description === "string" ? body.description : null;
 const { _max } = await db.card.aggregate({ where: { listId: id }, _max: { order: true } });
 return Response.json(await db.card.create({ data: { title, description, listId: id, order: (_max.order ?? -1) + 1 } }), { status: 201 });
}
