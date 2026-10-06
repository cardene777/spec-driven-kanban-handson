import {respond} from "@/lib/api";
type Context = {params:Promise<{id:string}>};
async function handler(req:Request,ctx:Context) { const {id}=await ctx.params; return respond(req,"list",undefined,id); }
export {handler as GET,handler as POST};
