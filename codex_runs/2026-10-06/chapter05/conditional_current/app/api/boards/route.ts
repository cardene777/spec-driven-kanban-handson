import { handle } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request) { return handle(request,"boards"); }
export async function POST(request: Request) { return handle(request,"boards"); }
