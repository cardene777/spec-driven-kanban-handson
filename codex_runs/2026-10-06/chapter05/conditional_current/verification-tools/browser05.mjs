import {chromium,expect} from '@playwright/test';import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'chromium'});const page=await browser.newPage({viewport:{width:1400,height:1000}});const rows=[];
page.on('pageerror',e=>rows.push('pageerror:'+e.message));
async function rename(button,value){page.once('dialog',d=>d.accept(value));await button.click();await page.getByText(value,{exact:true}).first().waitFor();}
async function remove(button){page.once('dialog',d=>d.accept());await button.click();}
await page.goto('http://127.0.0.1:3215');
await page.getByLabel('新規ボード名',{exact:true}).fill('デザイン検証');await page.getByRole('button',{name:'作成',exact:true}).click();
await rename(page.locator('main section').filter({has:page.getByRole('link',{name:'デザイン検証',exact:true})}).getByRole('button',{name:'ボード名編集'}),'編集ボード');
await page.getByRole('link',{name:'編集ボード',exact:true}).first().click();await page.waitForURL("**/boards/*");const url=page.url();
await page.getByRole('navigation',{name:'最近のボード',exact:true}).getByRole('link',{name:'編集ボード',exact:true}).click();await expect(page).toHaveURL(url);rows.push('recent-board navigation same URL');
await page.getByLabel('新規リスト名',{exact:true}).fill('リストA');await page.getByRole('button',{name:'作成',exact:true}).first().click();await page.getByText('カードがありません',{exact:true}).first().waitFor();
await rename(page.getByRole('button',{name:'リスト名編集',exact:true}),'編集リスト');
await page.getByLabel('新規カード名',{exact:true}).fill('カードA');await page.locator('.list').getByRole('button',{name:'作成',exact:true}).click();await page.getByRole('button',{name:'カードA',exact:true}).click();
const dialog=page.getByRole('dialog',{name:'カード詳細',exact:true});await dialog.waitFor();
await page.screenshot({path:'evidence/section05-dialog.png'});
await page.keyboard.press('Tab');const inside=await dialog.evaluate(el=>el.contains(document.activeElement));if(!inside)throw Error('Tab outside dialog');rows.push('Tab stays in dialog');
await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});rows.push('Esc closes dialog');
await page.getByRole('button',{name:'カードA',exact:true}).click();await dialog.getByLabel('題名',{exact:true}).fill('編集カード');await dialog.getByLabel('説明',{exact:true}).fill('説明保存');await dialog.getByRole('button',{name:'保存',exact:true}).click();
await page.getByRole('button',{name:'編集カード',exact:true}).click();await expect(dialog.getByLabel('説明',{exact:true})).toHaveValue('説明保存');await page.keyboard.press('Escape');
const light=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);await page.emulateMedia({colorScheme:'dark'});const dark=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);if(light!==dark)throw Error('dark changed light theme');
rows.push({light,dark,h1Font:await page.locator('h1').evaluate(el=>getComputedStyle(el).fontFamily)});
await page.screenshot({path:'evidence/section05-board.png'});await remove(page.getByRole('button',{name:'カード削除',exact:true}));await page.getByText('カードがありません',{exact:true}).waitFor();
await remove(page.getByRole('button',{name:'リスト削除',exact:true}));await page.getByText('リストがありません',{exact:true}).waitFor();
await page.getByRole('navigation',{name:'パンくず',exact:true}).getByRole('link',{name:'ボード一覧',exact:true}).click();
const section=page.locator('main section').filter({has:page.getByRole('link',{name:'編集ボード',exact:true})});await remove(section.getByRole('button',{name:'ボード削除',exact:true}));await expect(section).toHaveCount(0);
await page.screenshot({path:'evidence/section05-list.png'});rows.push('Board/List/Card create/edit/delete and card description persisted');
if(rows.some(r=>typeof r==='string'&&r.startsWith('pageerror')))throw Error(JSON.stringify(rows));writeFileSync('evidence/browser05.json',JSON.stringify(rows,null,2));console.log(rows);await browser.close();
