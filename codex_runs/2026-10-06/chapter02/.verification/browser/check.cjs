const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const stage = Number(process.argv[2]);
const base = process.argv[3];
const statePath = path.join(__dirname, base.endsWith('3101') ? 'skill-state.json' : 'prompt-state.json');
function assert(condition,message) { if(!condition) throw Error(message); console.log('PASS',message); }
(async()=>{
 const browser = await chromium.launch({headless:true}); const page = await browser.newPage();
 const browserErrors=[];page.on('pageerror',e=>browserErrors.push(e.message));
 const api=async(method,url,body,status)=>{
 const r=await page.request.fetch(base+url,{method,data:body});assert(r.status()===status,`${method} ${url} status ${status}`);return await r.json();};
 let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{};
 await page.goto(base);
 assert(await page.getByRole('heading',{name:'カンバン一覧'}).isVisible(),'一覧をブラウザ表示');
 const create=async(scope,label,title)=>{
 await scope.getByRole('button',{name:label,exact:true}).click();await scope.getByRole('textbox',{name:'タイトル',exact:true}).fill(title);
 const response=page.waitForResponse(r=>r.request().method()==='POST');await scope.getByRole('button',{name:'作成',exact:true}).click();return await response;};
 const invalid=async(scope,label,max,url)=>{
 const before=await api('GET',url,undefined,200);
 for(const title of ['', 'a'.repeat(max+1)]){
 const r=await create(scope,label,title);assert(r.status()===400,'画面送信が400');assert((await r.json()).error.code==='VALIDATION_ERROR','検証エラーcode');
 await scope.locator('p[role=alert]').waitFor();assert(await scope.locator('p[role=alert]').isVisible(),'画面にエラー表示');await scope.getByRole('button',{name:'キャンセル'}).click();
 }
 const after=await api('GET',url,undefined,200);assert(after.length===before.length,'不正入力で追加なし');};
 if(stage===1 || stage===5){
 if(!state.board){const r=await create(page,'新規ボード作成','会社プロジェクト');assert(r.status()===201,'画面ボード作成');state.board=(await r.json()).id;fs.writeFileSync(statePath,JSON.stringify(state));}
 await page.getByRole('link',{name:'会社プロジェクト',exact:true}).waitFor();await page.reload();assert(await page.getByRole('link',{name:'会社プロジェクト',exact:true}).isVisible(),'ボードreload永続化');
 await invalid(page,'新規ボード作成',100,'/api/boards');
 await page.getByRole('link',{name:'会社プロジェクト',exact:true}).click();await page.waitForURL(base+'/boards/'+state.board);assert(await page.getByRole('heading',{name:'会社プロジェクト'}).isVisible(),'カードクリックで詳細遷移');
 }
 if(stage>=2){
 await page.goto(base+'/boards/'+state.board);assert(await page.getByRole('heading',{name:'会社プロジェクト'}).isVisible(),'ボード名表示');
 if(stage===2 || stage===5){
 state.lists=[];for(const title of ['ToDo','進行中','Done']){const r=await create(page,'リスト作成',title);assert(r.status()===201,'画面リスト作成 '+title);state.lists.push((await r.json()).id);await page.getByRole('heading',{name:title,exact:true}).waitFor();}
 const lists=await api('GET',`/api/boards/${state.board}/lists`,undefined,200);assert(lists.map(l=>l.title).join(',')==='ToDo,進行中,Done','リスト順序');assert(lists.every((l,i)=>l.order===i),'リストorder 0,1,2');
 const boxes=await Promise.all(['ToDo','進行中','Done'].map(t=>page.getByRole('heading',{name:t,exact:true}).boundingBox()));assert(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x&&Math.abs(boxes[0].y-boxes[2].y)<5,'リスト横並び');
 await invalid(page,'リスト作成',100,`/api/boards/${state.board}/lists`);
 for(const method of ['GET','POST']){const r=await api(method,'/api/boards/not-found/lists',method==='POST'?{title:''}:undefined,404);assert(r.error.code==='NOT_FOUND','欠損ボード404優先');}
 }
 }
 if(stage>=3){
 const col=page.locator('section').filter({has:page.getByRole('heading',{name:'ToDo',exact:true})});
 if(stage===3 || stage===5){
 state.cards=[];for(const title of ['要件を確認','APIを実装']){const r=await create(col,'カード追加',title);assert(r.status()===201,'画面カード追加 '+title);const data=await r.json();state.cards.push(data.id);assert(data.description===null,'省略description null');await col.getByText(title,{exact:true}).waitFor();}
 const cards=await api('GET',`/api/lists/${state.lists[0]}/cards`,undefined,200);assert(cards.map(c=>c.title).join(',')==='要件を確認,APIを実装','カード順序');assert(cards.every((c,i)=>c.order===i),'カードorder 0,1');
 const boxes=await Promise.all(['要件を確認','APIを実装'].map(t=>col.getByText(t,{exact:true}).boundingBox()));assert(boxes[0].y<boxes[1].y,'カード縦並び');
 await invalid(col,'カード追加',200,`/api/lists/${state.lists[0]}/cards`);
 for(const method of ['GET','POST']){const r=await api(method,'/api/lists/not-found/cards',method==='POST'?{title:''}:undefined,404);assert(r.error.code==='NOT_FOUND','欠損リスト404優先');}
 }
 if(stage===4 || stage===5){
 await col.getByRole('button',{name:'要件を確認',exact:true}).click();await col.getByRole('textbox',{name:'カードタイトル'}).fill('要件を再確認');
 let response=page.waitForResponse(r=>r.request().method()==='PATCH');await page.getByRole('heading',{name:'会社プロジェクト'}).click();assert((await response).status()===200,'blurでPATCH保存');await col.getByRole('button',{name:'要件を再確認',exact:true}).waitFor();
 for(const title of ['', 'a'.repeat(201)]){
 await col.getByRole('button',{name:'要件を再確認',exact:true}).click();await col.getByRole('textbox',{name:'カードタイトル'}).fill(title);response=page.waitForResponse(r=>r.request().method()==='PATCH');await page.getByRole('heading',{name:'会社プロジェクト'}).click();assert((await response).status()===400,'編集異常400');await col.locator('p[role=alert]').waitFor();assert(await col.getByRole('button',{name:'要件を再確認',exact:true}).isVisible(),'編集失敗時に以前のタイトル保持');
 }
 const r=await api('PATCH','/api/cards/not-found',{title:''},404);assert(r.error.code==='NOT_FOUND','欠損カード404優先');
 }
 await page.reload();assert(await page.getByText(stage>=4?'要件を再確認':'要件を確認',{exact:true}).isVisible(),'reloadでカード永続化');
 }
 await page.reload();
 if(stage>=2){for(const title of ['ToDo','進行中','Done']) assert(await page.getByRole('heading',{name:title,exact:true}).isVisible(),'reloadでリスト保持 '+title);}
 if(stage>=4){const saved=await api('GET',`/api/lists/${state.lists[0]}/cards`,undefined,200);assert(saved[0].title==='要件を再確認','APIでも編集値を保存');}
 fs.writeFileSync(statePath,JSON.stringify(state));assert(browserErrors.length===0,'ブラウザpageerrorなし');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
