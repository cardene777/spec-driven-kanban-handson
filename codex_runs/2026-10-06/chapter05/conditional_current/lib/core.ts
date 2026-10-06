// spec/001-003 FR1-5; design/001-003 API and transaction sections.
import { db } from "./db";
import type { Prisma } from "../generated/prisma/client";
export type Kind = "boards" | "lists" | "cards";
export class ApiError extends Error {
 constructor(public status: number, message: string, public fields?: Record<string,string>) { super(message); }
}
const invalid = (field: string) => { throw new ApiError(422, "validation_error", { [field]: "invalid" }); };
export function validate(kind: Kind, body: Record<string,unknown>, create: boolean) {
 if (create || "title" in body) {
  if (typeof body.title !== "string" || body.title.length < 1 || body.title.length > (kind === "cards" ? 200 : 100)) invalid("title");
 }
 if (kind === "cards" && "description" in body && (typeof body.description !== "string" || body.description.length > 2000)) invalid("description");
 if ("targetOrder" in body && (!Number.isInteger(body.targetOrder) || (body.targetOrder as number) < 0)) invalid("targetOrder");
}
function repository(tx: Prisma.TransactionClient, kind: Kind) {
 // Identical models expose different delegate signatures; normalize the shared operations.
 const delegate = kind === "boards" ? tx.board : kind === "lists" ? tx.list : tx.card;
 return delegate as unknown as {
  findMany(args: unknown): Promise<Record<string,unknown>[]>;
  findUnique(args: unknown): Promise<Record<string,unknown>|null>;
  create(args: unknown): Promise<Record<string,unknown>>;
  update(args: unknown): Promise<Record<string,unknown>>;
  delete(args: unknown): Promise<Record<string,unknown>>;
 };
}
function scope(kind: Kind, parent?: string) { return kind === "lists" ? { boardId: parent } : kind === "cards" ? { listId: parent } : {}; }
async function exists(tx: Prisma.TransactionClient, kind: Kind, id: string) {
 const item = await repository(tx,kind).findUnique({where:{id}});
 if (!item) throw new ApiError(404,"not_found");
 return item;
}
export async function operate(kind: Kind, method: string, id?: string, parent?: string, body: Record<string,unknown> = {}) {
 return db.$transaction(async tx => {
  if (parent) await exists(tx, kind === "lists" ? "boards" : "lists",parent);
  const item = id ? await exists(tx,kind,id) : undefined;
  const where = scope(kind,parent ?? (item?.boardId ?? item?.listId) as string|undefined);
  const repo = repository(tx,kind);
  if (method === "GET") return item ?? {items: await repo.findMany({where,orderBy:[{order:"asc"},{id:"asc"}]})};
  // Authentication and role checks intentionally pass in the initial scope.
  if (method !== "DELETE") validate(kind,body,method === "POST");
  if (method === "POST") {
   const siblings = await repo.findMany({where,orderBy:{order:"asc"}});
   return repo.create({data:{...where,title:body.title,order:siblings.length,...(kind === "cards" ? {description:body.description ?? ""} : {})}});
  }
  if (method === "DELETE") {
   await repo.delete({where:{id}});
   const rest = await repo.findMany({where,orderBy:{order:"asc"}});
   for (const [order,row] of rest.entries()) await repo.update({where:{id:row.id},data:{order}});
   return null;
  }
  if (method === "PATCH") {
   if ("targetOrder" in body) {
    const siblings = await repo.findMany({where,orderBy:{order:"asc"}});
    if ((body.targetOrder as number) >= siblings.length) invalid("targetOrder");
    const ordered = siblings.filter(row => row.id !== id);
    ordered.splice(body.targetOrder as number,0,item!);
    for (const [order,row] of ordered.entries()) await repo.update({where:{id:row.id},data:{order}});
   }
   return repo.update({where:{id},data:{...("title" in body ? {title:body.title} : {}),...(kind === "cards" && "description" in body ? {description:body.description} : {})}});
  }
  throw new ApiError(405,"method_not_allowed");
 });
}
