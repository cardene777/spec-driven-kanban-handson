import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const base='http://127.0.0.1:3215';const rows=[];
async function req(path,method,body,status){const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,status);assert.ok(r.headers.get('x-request-id'));const data=r.status===204?null:await r.json();rows.push({method,path,status:r.status,data});return data;}
const b=await req('/api/boards','POST',{title:'HTTP'},201);
const l=await req(`/api/boards/${b.id}/lists`,'POST',{title:'L'},201);
const c=await req(`/api/lists/${l.id}/cards`,'POST',{title:'C',description:''},201);
await req(`/api/cards/${c.id}`,'PATCH',{description:'x'.repeat(2001)},422);
await req(`/api/cards/${c.id}`,'PATCH',{description:''},200);
await req('/api/boards','POST',{title:''},422);
await req('/api/cards/missing','PATCH',{title:''},404);
await req(`/api/cards/${c.id}`,'DELETE',undefined,204);
await req(`/api/cards/${c.id}`,'GET',undefined,404);
await req(`/api/lists/${l.id}`,'DELETE',undefined,204);
await req(`/api/boards/${b.id}`,'DELETE',undefined,204);
writeFileSync('evidence/http02.json',JSON.stringify(rows,null,2));console.log(rows.map(({method,path,status})=>({method,path,status})));
