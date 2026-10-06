import { ApiError, operate, type Kind } from "./core";
export async function handle(request: Request, kind: Kind, id?: string, parent?: string) {
 const requestId = crypto.randomUUID();
 let status = 200;
 let response: unknown;
 try {
  // Parse after resource existence checks: operate handles both before validation.
  let body: Record<string,unknown> = {};
  let malformed = false;
  if (["POST","PATCH"].includes(request.method)) {
   try { const parsed: unknown = await request.json(); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) malformed = true; else body = parsed as Record<string,unknown>; } catch { malformed = true; }
  }
  if (malformed) {
   if (id || parent) await operate(kind,"GET",id,parent);
   throw new ApiError(422,"validation_error",{body:"invalid JSON"});
  }
  response = await operate(kind,request.method,id,parent,body);
  status = request.method === "POST" ? 201 : request.method === "DELETE" ? 204 : 200;
 } catch (e) {
  status = e instanceof ApiError ? e.status : 500;
  response = e instanceof ApiError ? {error:e.message,...(e.fields ? {fields:e.fields} : {})} : {error:"internal_error"};
  console.error(JSON.stringify({requestId,kind,method:request.method,status,error:e instanceof ApiError ? e.message : "internal_error"}));
 }
 console.info(JSON.stringify({requestId,kind,method:request.method,status}));
 return status === 204 ? new Response(null,{status,headers:{"x-request-id":requestId}}) : Response.json(response,{status,headers:{"x-request-id":requestId}});
}
