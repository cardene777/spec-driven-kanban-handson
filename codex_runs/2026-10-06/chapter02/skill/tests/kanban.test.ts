// FR-COM-001/002/003/004, FR-BOARD-001/002, FR-LIST-001/002, FR-CARD-001/002, FR-EDIT-001
import { beforeEach, afterAll, expect, test } from 'vitest';
import { db } from '@/lib/db';
import * as boards from '@/app/api/boards/route';
import * as lists from '@/app/api/boards/[id]/lists/route';
import * as cards from '@/app/api/lists/[id]/cards/route';
import { PATCH } from '@/app/api/cards/[id]/route';
const req = (title: string, method = 'POST') => new Request('http://localhost', { method, body: JSON.stringify({ title }) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(async () => { await db.card.deleteMany(); await db.list.deleteMany(); await db.board.deleteMany(); });
afterAll(async () => { await db.$disconnect(); });
async function parents() {
 const board = await db.board.create({ data: { title: 'B' } });
 const list = await db.list.create({ data: { title: 'L', boardId: board.id, order: 0 } });
 return { board, list };
}
test('Board作成、トリム、一覧', async () => {
 const r = await boards.POST(req(' \t　会社プロジェクト　\n'));
 expect(r.status).toBe(201); const b = await r.json(); expect(b.title).toBe('会社プロジェクト');
 expect(b.id).toBeTypeOf('string'); expect(b.createdAt).toBeTypeOf('string');
 expect((await (await boards.GET()).json()).map((b: {title:string})=>b.title)).toEqual(['会社プロジェクト']);
});
test('BoardのcreatedAt降順', async () => {
 await db.board.create({ data: { title: '古い', createdAt: new Date('2020-01-01') } });
 await db.board.create({ data: { title: '新しい', createdAt: new Date('2021-01-01') } });
 expect((await (await boards.GET()).json()).map((b:{title:string})=>b.title)).toEqual(['新しい','古い']);
});
test.each(['', 'a'.repeat(101)])('Board不正titleで追加なし', async title => {
 const r=await boards.POST(req(title)); expect(r.status).toBe(400);expect((await r.json()).error.code).toBe('VALIDATION_ERROR');expect(await db.board.count()).toBe(0);
});
test.each([1,100])('Board境界%d文字を保存', async n=>{expect((await boards.POST(req('a'.repeat(n)))).status).toBe(201);});
test('List作成、表示順、親別採番、最大order+1', async () => {
 const b=await db.board.create({data:{title:'B'}}), other=await db.board.create({data:{title:'Other'}});
 const first=await lists.POST(req(' ToDo　'),context(b.id));expect(first.status).toBe(201);expect((await first.json()).order).toBe(0);
 await db.list.create({data:{title:'Gap',boardId:b.id,order:7}});
 const next=await (await lists.POST(req('進行中'),context(b.id))).json();expect(next.order).toBe(8);expect(next.boardId).toBe(b.id);
 expect((await (await lists.POST(req('Other'),context(other.id))).json()).order).toBe(0);
 const data=await (await lists.GET(req(''),context(b.id))).json();expect(data.map((l:{order:number})=>l.order)).toEqual([0,7,8]);expect(data[0].title).toBe('ToDo');
});
test.each(['', 'a'.repeat(101)])('List不正titleで追加なし', async title => {
 const b=await db.board.create({data:{title:'B'}});const r=await lists.POST(req(title),context(b.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe('VALIDATION_ERROR');expect(await db.list.count()).toBe(0);
});
test('欠損BoardはGETと不正POSTとも404', async () => {
 for (const r of [await lists.GET(req(''),context('missing')),await lists.POST(req(''),context('missing'))]) {expect(r.status).toBe(404);expect((await r.json()).error.code).toBe('NOT_FOUND');}
});
test('Card作成、null、トリム、親別採番と表示順', async () => {
 const {board,list}=await parents();const other=await db.list.create({data:{title:'Other',boardId:board.id,order:1}});
 const r=await cards.POST(req('　要件を確認 \t\n'),context(list.id));expect(r.status).toBe(201);const c=await r.json();expect(c.title).toBe('要件を確認');expect(c.description).toBeNull();expect(c.order).toBe(0);
 await db.card.create({data:{title:'Gap',listId:list.id,order:7}});
 expect((await (await cards.POST(req('APIを実装'),context(list.id))).json()).order).toBe(8);
 expect((await (await cards.POST(req('Other'),context(other.id))).json()).order).toBe(0);
 const data=await (await cards.GET(req(''),context(list.id))).json();expect(data.map((c:{order:number})=>c.order)).toEqual([0,7,8]);
});
test.each(['', 'a'.repeat(201)])('Card不正titleで追加なし', async title => {
 const {list}=await parents();const r=await cards.POST(req(title),context(list.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe('VALIDATION_ERROR');expect(await db.card.count()).toBe(0);
});
test.each([1,200])('Card作成境界%d文字', async n=>{const {list}=await parents();expect((await cards.POST(req('a'.repeat(n)),context(list.id))).status).toBe(201);});
test('欠損ListはGETと不正POSTとも404', async () => {
 for (const r of [await cards.GET(req(''),context('missing')),await cards.POST(req(''),context('missing'))]) {expect(r.status).toBe(404);expect((await r.json()).error.code).toBe('NOT_FOUND');}
});
test('Card編集成功とトリム、不正titleでは更新なし', async () => {
 const {list}=await parents();const c=await db.card.create({data:{title:'前',listId:list.id,order:0}});
 const r=await PATCH(req('　要件を再確認 \t\n','PATCH'),context(c.id));expect(r.status).toBe(200);expect((await r.json()).title).toBe('要件を再確認');
 for(const title of ['', 'a'.repeat(201)]){const r=await PATCH(req(title,'PATCH'),context(c.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe('VALIDATION_ERROR');expect((await db.card.findUniqueOrThrow({where:{id:c.id}})).title).toBe('要件を再確認');}
});
test('欠損Cardへの不正PATCHは404を優先', async () => {const r=await PATCH(req('','PATCH'),context('missing'));expect(r.status).toBe(404);expect((await r.json()).error.code).toBe('NOT_FOUND');});
