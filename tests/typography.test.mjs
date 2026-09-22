import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const data = readFileSync(new URL('../assets/type-objects.js', import.meta.url), 'utf8');
const code = readFileSync(new URL('../typography.js', import.meta.url), 'utf8');
function run(isMobile) {
  const events = {}, frames = [], animations = [], media = [];
  let observe;
  class Node {
    constructor(dataset = {}) {this.dataset=dataset;this.children=[];this.style={};}
    append(node) {this.children.push(node);}
    replaceChildren(...nodes) {this.children=nodes;}
    getBoundingClientRect() {return {left:0,top:0,right:261,bottom:700,width:261,height:700};}
    get offsetWidth() {throw new Error('Per-letter layout read');}
    get offsetHeight() {throw new Error('Per-letter layout read');}
    get offsetLeft() {throw new Error('Per-letter layout read');}
    get offsetTop() {throw new Error('Per-letter layout read');}
    animate(keyframes,options) {
      const a={keyframes,options,currentTime:0,play(){this.playing=true;},pause(){this.playing=false;},cancel(){this.cancelled=true;}};
      animations.push(a);return a;
    }
  }
  const objects=['desktop','mobile'].map(variant=>new Node({type:'field',variant}));
  const window={addEventListener(name,cb){events[name]=cb;}};
  const document={hidden:false,createElement(){return new Node();},querySelectorAll(selector){return selector==='[data-type]'?objects:[];},documentElement:{addEventListener(){}},addEventListener(){}};
  const context=vm.createContext({window,document,Math,Number,Map,IntersectionObserver:class{constructor(cb){observe=cb;}observe(){}},ResizeObserver:class{observe(){}},matchMedia(query){const m={matches:query.includes('max-width')?isMobile:false,addEventListener(name,cb){this.change=cb;}};media.push(m);return m;},requestAnimationFrame(cb){frames.push(cb);return frames.length;}});
  vm.runInContext(data,context);vm.runInContext(code,context);
  return {objects,frames,animations,events,media,show(){observe(objects.map(target=>({target,isIntersecting:true})));}};
}
for(const mobile of [false,true])test(`${mobile?'mobile':'desktop'}: bounded DOM, compositor scrolling, idle JS sleeps`,()=>{
 const app=run(mobile), active=app.objects[mobile?1:0],hidden=app.objects[mobile?0:1];
 assert.equal(hidden.children.length,0);
 const letters=active.children[0].children[0].children;
 assert(letters.length<3000,`too many letters: ${letters.length}`);
 assert(letters.length>100);
 assert.equal(app.animations.length,1);
 app.show();
 if (mobile) assert(!app.animations[0].playing);
 else assert(app.animations[0].playing);
 assert.equal(app.frames.length,0);
 app.events.pointermove({clientX:120,clientY:120,pointerType:'mouse'});
 if (mobile) assert.equal(app.frames.length,0);
 let time=0;for(let i=0;i<12;i++)app.frames.shift()?.(time+=16);
 if (mobile) assert(!letters.some(n=>n.style.transform?.startsWith('translate(')));
 else assert(letters.some(n=>n.style.transform?.startsWith('translate(')));
 app.events.pointermove({clientX:-1000,clientY:-1000,pointerType:'mouse'});
 for(let i=0;i<150 && app.frames.length;i++)app.frames.shift()(time+=16);
 assert.equal(app.frames.length,0,'JS must stop once letters settle');
 app.media[0].matches=!mobile;app.media[0].change();
 assert.equal(active.children.length,0);assert.equal(hidden.children.length,1);
 assert(app.animations[0].cancelled);
 console.log(`${mobile?'mobile':'desktop'}: ${letters.length} letter nodes; no per-letter layout reads`);
});
