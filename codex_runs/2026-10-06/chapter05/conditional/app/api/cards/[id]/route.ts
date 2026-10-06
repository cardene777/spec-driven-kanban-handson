import { respond } from "@/lib/api";
type Context = {params: Promise<{id:string}>};
async function handler(req:Request,context:Context) { const {id} = await context.params; return respond(req,"card",id); }
export {handler as GET,handler as PATCH,handler as DELETE};
