import { handle } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: {params: Promise<{boardId:string}>}) { const p = await context.params; return handle(request,"boards",p.boardId,undefined); }
export async function PATCH(request: Request, context: {params: Promise<{boardId:string}>}) { const p = await context.params; return handle(request,"boards",p.boardId,undefined); }
export async function DELETE(request: Request, context: {params: Promise<{boardId:string}>}) { const p = await context.params; return handle(request,"boards",p.boardId,undefined); }
