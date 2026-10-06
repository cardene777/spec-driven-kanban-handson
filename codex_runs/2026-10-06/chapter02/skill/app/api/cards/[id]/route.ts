// FR-EDIT-001, FR-COM-002, FR-COM-004
import { db } from "@/lib/db";
import { readBody, validTitle, invalid, missing } from "@/lib/input";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!(await db.card.findUnique({ where: { id } }))) return missing();
 const title = validTitle((await readBody(request)).title, 200);
 if (title === null) return invalid(200);
 return Response.json(await db.card.update({ where: { id }, data: { title } }));
}
