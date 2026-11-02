import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stampHtml} from '../scripts/stamp-pages.mjs';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {routeLineHit} from '../src/breach-route-edit.ts';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const common={door:false,node:true,nodeKind:'move',flashRemaining:2,posture:'stand',
  pace:'walk',firePolicy:'engage',reserve:24,magazine:12};

test('LOOK/WATCH replaces overlapping strafe/pie controls',()=>{
 const ready=contextActionChoices({...common});
 assert.deepEqual(ready.filter(x=>x.group==='primary').map(x=>x.id),
   ['ctxLook','ctxWatch','ctxWait']);
 for(const old of ['ctxPie','ctxStrafe','ctxStrafeMove','ctxFocus'])
   assert.ok(!ready.some(x=>x.id===old));
 const active=contextActionChoices({...common,watchActive:true});
 assert.ok(active.some(x=>x.id==='ctxWatch'&&x.pressed));
 assert.ok(active.some(x=>x.id==='ctxReleaseWatch'));
 assert.ok(!contextActionChoices({...common,door:true})
   .some(x=>x.id==='ctxWatch'));
 assert.match(main,/case 'ctxWatch':[\s\S]*?armFacing\('watch'\)/);
 assert.match(main,/case 'ctxReleaseWatch':[\s\S]*?releaseWatch\(state/);
});

test('route line uses supplied rendered path and retains insertion order',()=>{
 const plan=[{id:1,kind:'move',p:{x:20,y:0}},
   {id:2,kind:'look',p:{x:20,y:0}},
   {id:3,kind:'move',p:{x:20,y:20}}];
 const seen=[];
 const path=(from,to)=>{seen.push([from,to]);return to.y===0?
   [{x:10,y:10},{x:20,y:0}]:[{x:20,y:20}];};
 const hit=routeLineHit({x:0,y:0},plan,{x:5,y:5},p=>p,3,path);
 assert.ok(hit);
 assert.equal(hit.index,0);
 assert.deepEqual(hit.point,{x:5,y:5});
 assert.equal(seen.length,2);
 assert.match(main,/displayRouteCache\.get\(from,to,state\.intel,true\)\.points/);
});

test('build checks never reload: only explicit NOW can navigate',async()=>{
 const html=stampHtml('<html><head></head><body></body></html>','old-build');
 const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(bootstrap);
 const listeners={},children=[],replaceCalls=[];
 function element(tag){
   return {tag,hidden:false,children:[],style:{cssText:''},setAttribute(){},
     addEventListener(name,fn){this['on'+name]=fn;},
     append(...nodes){this.children.push(...nodes);},
     appendChild(node){this.children.push(node);},
     textContent:'',id:'',className:''};
 }
 const document={
   readyState:'complete',visibilityState:'visible',baseURI:'https://example.test/Fieldwork3D/',
   body:element('body'),head:element('head'),
   createElement:element,getElementById:()=>null,querySelector:()=>null,
   addEventListener(name,fn){listeners[name]=fn;}
 };
 const window={
   location:{href:'https://example.test/Fieldwork3D/',replace:url=>replaceCalls.push(url)},
   setInterval(){},addEventListener(){}
 };
 const context={document,window,URL,Date,fetch:async()=>({
   ok:true,json:async()=>({id:'next-build'})
 })};
 vm.runInNewContext(bootstrap,context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(replaceCalls.length,0,'polling must not interrupt an ongoing round');
 const offer=document.body.children.find(x=>x.id==='fieldwork-update-offer');
 const compact=document.body.children.find(x=>x.id==='fieldwork-update-compact');
 assert.ok(offer&&compact,'update offers are accessible');
 const [now,later]=offer.children[2].children;
 later.onclick();
 assert.equal(offer.hidden,true);
 assert.equal(compact.hidden,false);
 assert.equal(replaceCalls.length,0);
 compact.onclick();
 assert.equal(offer.hidden,false);
 now.onclick();
 assert.equal(replaceCalls.length,1);
 assert.match(replaceCalls[0],/build=next-build/);
});
