import { core, type Kind } from "@/lib/core";
import { ApiError } from "@/lib/validation";
export async function respond(request: Request, kind: Kind, id?: string, parent?: string) {
 const requestId = crypto.randomUUID();
 let status = request.method === "POST" ? 201 : request.method === "DELETE" ? 204 : 200;
 let payload: unknown;
 try {
  payload = await core(kind,request.method,id,parent,async () => {
   try { const data = await request.json(); if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(); return data; }
   catch { throw new ApiError(422,"validation_error",{body:"JSONオブジェクトが必要です"}); }
  });
 } catch (error) {
  if (error instanceof ApiError) {status=error.status;payload={error:error.code,...(error.fields ? {fields:error.fields} : {})};}
  else {status=500;payload={error:"internal_error"}; console.error(JSON.stringify({requestId,event:"error",error: error instanceof Error ? error.name : "unknown"}));}
 }
 console.info(JSON.stringify({requestId,method:request.method,kind,id,parent,status}));
 return new Response(status === 204 ? null : JSON.stringify(payload),{status,headers:{"content-type":"application/json","x-request-id":requestId}});
}
