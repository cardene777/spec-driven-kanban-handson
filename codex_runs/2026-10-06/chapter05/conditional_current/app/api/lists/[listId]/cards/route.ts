import { handle } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: {params: Promise<{listId:string}>}) { const p = await context.params; return handle(request,"cards",undefined,p.listId); }
export async function POST(request: Request, context: {params: Promise<{listId:string}>}) { const p = await context.params; return handle(request,"cards",undefined,p.listId); }
