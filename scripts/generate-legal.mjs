import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import legalTools from '../integration/legal.js';
const root=new URL('../',import.meta.url);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body)=>`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="same-origin"><title>${escape(title)} — CEOMENTALITY</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{font:18px/1.65 system-ui,sans-serif;color:#171717;margin:0}main{max-width:900px;margin:auto;padding:32px 24px 72px}h1{font-size:clamp(28px,6vw,46px);line-height:1.15}h2{font-size:24px;line-height:1.35;margin-top:36px}a{color:#2451b2;overflow-wrap:anywhere}p,li{overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:12px 24px}.notice{border-left:3px solid #2451b2;background:#f3f5fa;padding:16px}small{font-size:14px}@media print{nav{display:none}body{font-size:11pt}main{max-width:none;padding:0}}</style><main>${body}</main></html>\n`;
export async function writeRevision(legal,docs){
  if(!/^\d{4}-\d{2}-\d{2}(?:\.[1-9]\d*)?$/.test(legal.revision))throw Error('Invalid legal revision');
  const directory=new URL('legal/'+legal.revision+'/',root);await mkdir(directory,{recursive:true});
  const files=[];
  const write=async(name,content)=>{
    const path=new URL(name,directory);let previous;
    try{previous=await readFile(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
    if(previous!==undefined&&previous!==content)throw Error(`Archived legal file differs: ${legal.revision}/${name}; use a new revision`);
    if(previous===undefined)await writeFile(path,content);
  };
  for(const [screen,doc]of Object.entries(docs))for(const purpose of [null,...Object.keys(doc.contexts||{})]){
    const snapshot=legalTools.snapshot(legal,screen,doc,purpose);
    const sections=legalTools.sections(doc,purpose);
    const links=section=>(section.links||[]).map(link=>`<p><a href="${escape(link.screen?link.screen+(link.extra?.purpose?'-'+link.extra.purpose:'')+'.html':link.href)}">${escape(link.label)}</a></p>`).join('');
    const html=page(doc.label,`<nav><a href="../index.html">Все редакции</a><a href="../../index.html">На сайт</a><a href="${snapshot.name}.txt" download>Скачать текст</a></nav><h1>${escape(doc.label)}</h1><p>Редакция ${escape(legal.revision)}${purpose?' / '+escape(doc.contexts[purpose].label):''}</p>${legal.draft?'<p class="notice">Проект документа для запуска сайта. Окончательная редакция публикуется до начала приёма заявок и оформления заказов.</p>':''}${sections.map(section=>`<section><h2>${escape(section.title)}</h2>${section.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}${links(section)}</section>`).join('')}`);
    await write(snapshot.name+'.txt',snapshot.text);await write(snapshot.name+'.html',html);
    files.push({document:screen,purpose:purpose||null,text:snapshot.name+'.txt',html:snapshot.name+'.html',sha256:createHash('sha256').update(snapshot.text).digest('hex')});
  }
  await write('manifest.json',JSON.stringify({revision:legal.revision,draft:legal.draft,encoding:'UTF-8',hashAlgorithm:'SHA-256',files},null,2)+'\n');
}
async function main(){
  const context={window:{}};vm.runInNewContext(await readFile(new URL('documents.js',root),'utf8'),context);
  const {CEO_LEGAL:legal,CEO_DOCUMENTS:docs}=context.window;await writeRevision(legal,docs);
  const revisions=(await readdir(new URL('legal/',root),{withFileTypes:true})).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}(?:\.[1-9]\d*)?$/.test(e.name)).map(e=>e.name).sort((a,b)=>b.localeCompare(a,'en',{numeric:true}));
  const body=`<nav><a href="../index.html">На сайт</a></nav><h1>Документы CEOMENTALITY</h1><p class="notice">Текущая рабочая редакция: ${legal.revision}. Сохранённые версии доступны без JavaScript и обращения к API. Окончательная редакция публикуется до начала приёма заявок и оформления заказов.</p>${revisions.map(revision=>`<section><h2>${escape(revision)}</h2><ul>${Object.entries(docs).map(([screen,doc])=>`<li><a href="${revision}/${screen}.html">${escape(doc.label)}</a></li>`).join('')}</ul><p><a href="${revision}/manifest.json">Перечень текстов и контрольные суммы</a></p></section>`).join('')}`;
  await writeFile(new URL('legal/index.html',root),page('Юридические документы',body));
  console.log('Legal text revisions verified and exported: '+revisions.join(', '));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
