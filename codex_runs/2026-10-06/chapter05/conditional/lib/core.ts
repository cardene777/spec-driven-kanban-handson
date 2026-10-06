// spec/001〜003 / design/001〜003: core CRUD only; no auth or archive.
import { db } from "@/lib/db";
import { ApiError, validate } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";
export type Kind = "board" | "list" | "card";
type Tx = Prisma.TransactionClient;
async function rows(tx: Tx, kind: Kind, parent?: string) {
 const where = kind === "list" ? {boardId: parent} : kind === "card" ? {listId:parent} : {};
 // Each Prisma delegate has a distinct generic signature; retain concrete branches.
 if (kind === "board") return tx.board.findMany({orderBy:{order:"asc"}});
 if (kind === "list") return tx.list.findMany({where,orderBy:{order:"asc"}});
 return tx.card.findMany({where,orderBy:{order:"asc"}});
}
async function find(tx: Tx, kind: Kind, id: string) {
 if (kind === "board") return tx.board.findUnique({where:{id}});
 if (kind === "list") return tx.list.findUnique({where:{id}});
 return tx.card.findUnique({where:{id}});
}
async function setOrder(tx: Tx, kind: Kind, id: string, order: number) {
 if (kind === "board") return tx.board.update({where:{id},data:{order}});
 if (kind === "list") return tx.list.update({where:{id},data:{order}});
 return tx.card.update({where:{id},data:{order}});
}
export async function core(kind: Kind, method: string, id?: string, parent?: string, input?: () => Promise<Record<string,unknown>>) {
 return db.$transaction(async tx => {
  // Authentication is assumed to pass in the initial implementation.
  if (parent && !await find(tx,kind === "list" ? "board" : "list",parent)) throw new ApiError(404,"not_found");
  const item = id ? await find(tx,kind,id) : null;
  if (id && !item) throw new ApiError(404,"not_found");
  // Authorization position: assumed to pass. See constitution role matrix.
  if (method === "GET") return id ? item : {items:await rows(tx,kind,parent)};
  const scope = item && "boardId" in item ? item.boardId as string : item && "listId" in item ? item.listId as string : parent;
  if (method === "DELETE") {
   if (kind === "board") await tx.board.delete({where:{id}});
   else if (kind === "list") await tx.list.delete({where:{id}});
   else await tx.card.delete({where:{id}});
   const remaining = await rows(tx,kind,scope);
   for (const [order,row] of remaining.entries()) await setOrder(tx,kind,row.id,order);
   return null;
  }
  const data = await input!(); validate(data,kind,method === "POST");
  if (method === "POST") {
   const order = (await rows(tx,kind,parent)).length;
   const title = data.title as string;
   if (kind === "board") return tx.board.create({data:{title,order}});
   if (kind === "list") return tx.list.create({data:{title,order,boardId:parent!}});
   return tx.card.create({data:{title,order,listId:parent!,description:(data.description as string | undefined) ?? ""}});
  }
  if (kind !== "board" && "order" in data) {
   const all = await rows(tx,kind,scope);
   if ((data.order as number) >= all.length) throw new ApiError(422,"validation_error",{order:"範囲外です"});
   const ordered = all.filter(row=>row.id!==id); ordered.splice(data.order as number,0,item!);
   for (const [order,row] of ordered.entries()) await setOrder(tx,kind,row.id,order);
  }
  const title = data.title as string | undefined;
  if (kind === "board") return tx.board.update({where:{id},data:{title}});
  if (kind === "list") return tx.list.update({where:{id},data:{title}});
  return tx.card.update({where:{id},data:{title,description:data.description as string | undefined}});
 });
}
