import { handle } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: {params: Promise<{boardId:string}>}) { const p = await context.params; return handle(request,"lists",undefined,p.boardId); }
export async function POST(request: Request, context: {params: Promise<{boardId:string}>}) { const p = await context.params; return handle(request,"lists",undefined,p.boardId); }
