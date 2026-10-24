import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import routing from '../routing.js';
import {createStaticServer} from '../server.mjs';

test('clean routes preserve order queries and invitation fragments',()=>{
  for(const name of routing.names){
    const old=new URL(`https://example.com/app.html?screen=${name}&orderId=order_1&demo=1#invitation=secret`);
    assert.equal(routing.redirect(old),`/${name}?orderId=order_1&demo=1#invitation=secret`);
    assert.equal(routing.screen(new URL('https://example.com/'+name)),name);
  }
  assert.equal(routing.redirect(new URL('https://example.com/app.html?orderId=a&screen=payment&colour=white')), '/payment?orderId=a&colour=white');
  assert.equal(routing.redirect(new URL('https://example.com/index.html?utm_source=test#community')),'/?utm_source=test#community');
  assert.equal(routing.redirect(new URL('https://example.com/api/v1/orders')),null);
  assert.equal(routing.redirect(new URL('https://example.com/app.html?screen=//evil.com')), '/objects');
});

test('static server redirects legacy pages and serves clean routes and assets',async()=>{
  const server=createStaticServer();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    for(const [path,target] of [['/index.html','/'],['/app.html?screen=payment&orderId=abc','/payment?orderId=abc'],['/app.html','/objects']]){
      const res=await fetch(base+path,{redirect:'manual'});
      assert.equal(res.status,301);assert.equal(res.headers.get('location'),target);
    }
    for(const path of ['/',...routing.names.map(n=>'/'+n),'/routing.js','/assets/wordmark.svg']){
      const res=await fetch(base+path,{redirect:'manual'});assert.equal(res.status,200,path);await res.arrayBuffer();
    }
  }finally{await new Promise(r=>server.close(r));}
});

test('nginx route allowlist matches the frontend routes',async t=>{
  // The nginx config lives in the backend repository; check it only when checked out beside this one.
  const config=await readFile(new URL('../../docker/nginx.landing.conf',import.meta.url),'utf8').catch(()=>null);
  if(config===null)return t.skip('docker/nginx.landing.conf is not available');
  const list=config.match(/location ~ \^\/\(([^)]+)\)\$/)[1].split('|');
  assert.deepEqual(list.sort(),[...routing.names].sort());
  assert.match(config,/absolute_redirect off/);
  assert.match(config,/\$request_uri ~ "\^\/app/);
});
