import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('../loader.js',import.meta.url),'utf8');
function run({reduced=false,hanging=false,skip=false}={}) {
 const classes=new Set(skip?[]:['is-loading']), timers=[], events={},animations=[];
 const root={classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:(...ks)=>ks.forEach(k=>classes.delete(k))}};
 const title={style:{},getBoundingClientRect:()=>({left:24,top:380,width:342,height:48}),animate(frames,options){const a={frames,options,finished:Promise.resolve(),cancel(){}};animations.push(a);return a;}};
 const progress={style:{}},caption={},letters={style:{},getBoundingClientRect:()=>({width:310})};
 const screen={removed:false,querySelector:s=>s==='.loading-wordmark'?title:s==='.loading-progress'?progress:s==='.loading-letters'?letters:caption,remove(){this.removed=true;}};
 const logo={animate:title.animate,decode:()=>Promise.reject(new Error('image unavailable')),getBoundingClientRect:()=>({left:24,top:28,width:164,height:11})};
 const content=[{inert:false},{inert:false}];
 const document={documentElement:root,querySelector:s=>s==='.loading-screen'?screen:logo,querySelectorAll:()=>content,fonts:{load:()=>hanging?new Promise(()=>{}):Promise.resolve()}};
 const window={addEventListener:(name,fn)=>{events[name]=fn;},dispatchEvent(){},ceoLoaderTimeout:10};
 vm.runInNewContext(source,{window,document,matchMedia:()=>({matches:reduced}),setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},Event:class{},Promise,getComputedStyle:()=>({fontSize:'45.462px'})});
 return {classes,screen,content,animations,events,async settle(){for(let i=0;i<20;i++){await Promise.resolve();timers.splice(0).forEach(fn=>fn());}}};
}
test('logo flies to the header and unlocks content even if an image fails',async()=>{
 const a=run();assert(a.content.every(n=>n.inert));await a.settle();
 assert(a.screen.removed);assert(!a.classes.has('is-loading'));assert(a.content.every(n=>!n.inert));
 assert.equal(a.animations.length,3);
 const flight=a.animations[0];
 for(const frame of flight.frames) {
   assert.match(frame.transform,/scale\([\d.]+\)/,'must use one uniform scale');
   assert.doesNotMatch(frame.transform,/scale[XY]/);
 }
 assert.deepEqual(a.animations.slice(1).map(x=>x.options.duration),[180,180]);
});
test('reduced motion skips the flight',async()=>{const a=run({reduced:true});await a.settle();assert(a.screen.removed);assert.equal(a.animations.length,0);});
test('asset timeout always unlocks the document',()=>{const a=run({hanging:true});a.events['ceo:loader-timeout']();assert(a.screen.removed);assert(a.content.every(n=>!n.inert));});
test('deep links do not show or lock the loader',()=>{const a=run({skip:true});assert(a.screen.removed);assert(a.content.every(n=>!n.inert));});
