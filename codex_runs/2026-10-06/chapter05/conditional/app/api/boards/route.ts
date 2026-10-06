import {respond} from "@/lib/api";
async function handler(req:Request) {return respond(req,"board");}
export {handler as GET,handler as POST};
