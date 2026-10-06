import {beforeEach,afterAll,describe,it,expect} from "vitest";
import { db } from "../lib/db";
import { operate,ApiError } from "../lib/core";
beforeEach(async()=>{await db.board.deleteMany();});
afterAll(async()=>{await db.$disconnect();});
describe("core specs 001-003",()=>{
 it("empty collection",async()=>{expect(await operate("boards","GET")).toEqual({items:[]});});
 it("board CRUD and cascade",async()=>{
  const b=await operate("boards","POST",undefined,undefined,{title:"B"}) as {id:string};
  const l=await operate("lists","POST",undefined,b.id,{title:"L"}) as {id:string};
  const c=await operate("cards","POST",undefined,l.id,{title:"C"}) as {id:string};
  expect(await operate("boards","PATCH",b.id,undefined,{title:"B2"})).toMatchObject({title:"B2"});
  expect(await operate("cards","PATCH",c.id,undefined,{title:"C2",description:"説明"})).toMatchObject({title:"C2",description:"説明"});
  await operate("boards","DELETE",b.id);expect(await db.card.count()).toBe(0);expect(await db.list.count()).toBe(0);
  await expect(operate("cards","GET",c.id)).rejects.toMatchObject({status:404});
 });
 it.each(["", "x".repeat(101)])("board invalid title length %s",async title=>{await expect(operate("boards","POST",undefined,undefined,{title})).rejects.toBeInstanceOf(ApiError);});
 it("title boundary and description empty/max",async()=>{
  const b=await operate("boards","POST",undefined,undefined,{title:"x".repeat(100)}) as {id:string};
  const l=await operate("lists","POST",undefined,b.id,{title:"x".repeat(100)}) as {id:string};
  const c=await operate("cards","POST",undefined,l.id,{title:"x".repeat(200),description:""}) as {id:string};
  expect(await operate("cards","PATCH",c.id,undefined,{description:"x".repeat(2000)})).toMatchObject({description:"x".repeat(2000)});
  await expect(operate("cards","PATCH",c.id,undefined,{description:"x".repeat(2001)})).rejects.toMatchObject({status:422});
  await expect(operate("cards","PATCH",c.id,undefined,{title:"x".repeat(201)})).rejects.toMatchObject({status:422});
 });
 it("reorder lists/cards then delete compacts",async()=>{
  const b=await operate("boards","POST",undefined,undefined,{title:"B"}) as {id:string};
  const l=await operate("lists","POST",undefined,b.id,{title:"L"}) as {id:string};
  const l2=await operate("lists","POST",undefined,b.id,{title:"L2"}) as {id:string};
  await operate("lists","PATCH",l2.id,undefined,{targetOrder:0});
  expect(await operate("lists","GET",undefined,b.id)).toMatchObject({items:[{id:l2.id,order:0},{id:l.id,order:1}]});
  const c=await operate("cards","POST",undefined,l.id,{title:"C"}) as {id:string};
  const c2=await operate("cards","POST",undefined,l.id,{title:"C2"}) as {id:string};
  await operate("cards","PATCH",c2.id,undefined,{targetOrder:0});
  await operate("cards","DELETE",c2.id);expect(await operate("cards","GET",c.id)).toMatchObject({order:0});
  await expect(operate("cards","PATCH",c.id,undefined,{targetOrder:1})).rejects.toMatchObject({status:422});
 });
 it("missing parent/id checked before validation",async()=>{await expect(operate("lists","POST",undefined,"missing",{title:""})).rejects.toMatchObject({status:404});});
});
