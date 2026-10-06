import { handle } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: {params: Promise<{cardId:string}>}) { const p = await context.params; return handle(request,"cards",p.cardId,undefined); }
export async function PATCH(request: Request, context: {params: Promise<{cardId:string}>}) { const p = await context.params; return handle(request,"cards",p.cardId,undefined); }
export async function DELETE(request: Request, context: {params: Promise<{cardId:string}>}) { const p = await context.params; return handle(request,"cards",p.cardId,undefined); }
