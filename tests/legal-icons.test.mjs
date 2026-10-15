import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('legal documents keep source seller details, distinct purposes and explicit draft limits',async()=>{
 const context={window:{}};vm.runInNewContext(await readFile(new URL('documents.js',root),'utf8'),context);
 const {CEO_LEGAL:legal,CEO_DOCUMENTS:docs}=context.window;
 assert.equal(Object.keys(docs).length,6);assert.equal(legal.draft,true);
 assert.equal(legal.seller.inn,'772463930459');assert.equal(legal.seller.ogrnip,'325774600559950');
 assert.equal(legal.seller.email,'timiz.work@mail.ru');
 assert.equal(legal.seller.bank,'Т-Банк');
 const purchase=JSON.stringify(docs['purchase-terms']);
 for(const term of ['СБП','Т-Банк','СДЭК','CloudKassir','Платформа ОФД','Участие в клубе бесплатное'])assert(purchase.includes(term),term);
 assert(purchase.includes('предварительно'));
 assert(JSON.stringify(docs.privacy).includes('Соответствие инфраструктуры требованиям локализации пока не подтверждено'));
 assert(JSON.stringify(docs.agreement).includes('уведомление о принятии направляется через Telegram-бота'));
 for(const doc of Object.values(docs)){
  assert(doc.label&&doc.sections.length&&doc.pending.length);
  assert(!JSON.stringify(doc).includes('[ИНН продавца]'));
  for(const section of doc.sections)for(const link of section.links||[])assert(link.screen?docs[link.screen]:/^(mailto:|https:\/\/t\.me\/)/.test(link.href));
 }
 const contexts=docs['data-consent'].contexts;
 assert.equal(Object.keys(contexts).length,3);
 assert(!contexts.contact.data.includes('телефон'));
 assert(contexts['purchase-application'].data.includes('Telegram'));
 assert(contexts.application.data.includes('проекте'));
 assert.equal(new Set(Object.values(contexts).map(c=>c.purpose)).size,3);
});
test('manifest assets are square, correctly sized and backed by a multi-size ICO',async()=>{
 const manifest=JSON.parse(await readFile(new URL('site.webmanifest',root),'utf8'));
 assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
 assert(manifest.icons.some(i=>i.purpose==='maskable'));
 for(const icon of manifest.icons){
  const png=await readFile(new URL(icon.src,root));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`,icon.sizes);
 }
 for(const size of [96,120,144,150,152,167,180]){
  const png=await readFile(new URL(`assets/icons/icon-${size}.png`,root));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 const ico=await readFile(new URL('favicon.ico',root));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),4);
 assert.deepEqual(Array.from({length:4},(_,i)=>ico[6+i*16]||256),[16,32,48,256]);
 const svg=await readFile(new URL('favicon.svg',root),'utf8');assert(svg.includes('viewBox="0 0 64 64"'));assert(!svg.includes('<text'));
});
