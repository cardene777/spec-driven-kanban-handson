import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
process.env.DATABASE_URL="file:./.verification/test.db";
const { core } = await import("@/lib/core");
const { db } = await import("@/lib/db");
beforeAll(()=>{rmSync(".verification/test.db",{force:true});execFileSync("node",["node_modules/prisma/build/index.js","migrate","deploy"],{env:process.env});});
afterAll(()=>db.$disconnect());
const input=(data:Record<string,unknown>)=>async()=>data;
describe("initial CRUD",()=>{
 it("empty list returns items",async()=>expect(await core("board","GET")).toEqual({items:[]}));
 it.each(["", "x".repeat(101), 123])("rejects invalid Board title %s",async title=>{await expect(core("board","POST",undefined,undefined,input({title}))).rejects.toMatchObject({status:422});});
 it("CRUD, description, ordering, cascade and missing resources",async()=>{
  const b=await core("board","POST",undefined,undefined,input({title:"B"})) as {id:string};
  const l=await core("list","POST",undefined,b.id,input({title:"L"})) as {id:string};
  const c=await core("card","POST",undefined,l.id,input({title:"C",description:""})) as {id:string};
  const d=await core("card","POST",undefined,l.id,input({title:"D"})) as {id:string};
  expect(await core("card","PATCH",c.id,undefined,input({description:"x".repeat(2000)}))).toMatchObject({description:"x".repeat(2000)});
  await expect(core("card","PATCH",c.id,undefined,input({description:"x".repeat(2001)}))).rejects.toMatchObject({status:422});
  expect(await core("card","PATCH",c.id,undefined,input({description:""}))).toMatchObject({description:""});
  await core("card","PATCH",d.id,undefined,input({order:0}));
  expect(await core("card","GET",undefined,l.id)).toMatchObject({items:[{id:d.id,order:0},{id:c.id,order:1}]});
  await expect(core("card","PATCH",c.id,undefined,input({order:2}))).rejects.toMatchObject({status:422});
  await core("board","DELETE",b.id);await expect(core("card","GET",c.id)).rejects.toMatchObject({status:404});
 });
 it.each(["board","list","card"] as const)("returns 404 for missing %s",async kind=>await expect(core(kind,"GET","missing")).rejects.toMatchObject({status:404}));
});
