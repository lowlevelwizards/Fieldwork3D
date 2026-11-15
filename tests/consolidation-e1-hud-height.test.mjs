import test from 'node:test';
import assert from 'node:assert/strict';
import {createTacticalHudHeightSync} from '../src/ui/tactical-hud-height.ts';
test('E1.E synchronizes initial height and only measures on ResizeObserver resize',()=>{
 const savedDocument=globalThis.document,savedResize=globalThis.ResizeObserver;
 const values=new Map(),writes=[];
 const root={getPropertyValue:key=>values.get(key)??'',
  setProperty:(key,value)=>{values.set(key,value);writes.push(value);}};
 let observer=null,reads=0,observes=0,disconnects=0,height=134;
 const hud={getBoundingClientRect(){reads++;return {height};}};
 try{
  globalThis.document={documentElement:{style:root}};
  globalThis.ResizeObserver=class{
   constructor(cb){this.cb=cb;observer=this;}
   observe(el){assert.equal(el,hud);observes++;}
   disconnect(){disconnects++;}
  };
  const sync=createTacticalHudHeightSync();
  sync.sync(hud);sync.sync(hud);sync.sync(hud);
  assert.deepEqual([reads,observes,disconnects,writes.length],[1,1,0,1]);
  height=149;observer.cb();observer.cb();
  assert.deepEqual(writes,['134px','149px']);
  assert.equal(reads,3);
  sync.dispose();
  assert.equal(disconnects,1);
 }finally{
  if(savedDocument===undefined)delete globalThis.document;
  else globalThis.document=savedDocument;
  if(savedResize===undefined)delete globalThis.ResizeObserver;
  else globalThis.ResizeObserver=savedResize;
 }
});
test('E1.E retains synchronous exact fallback when ResizeObserver unavailable',()=>{
 const savedDocument=globalThis.document,savedResize=globalThis.ResizeObserver;
 let reads=0,height=91;const writes=[];
 try{
  globalThis.document={documentElement:{style:{
   value:'',getPropertyValue(){return this.value;},
   setProperty(_,v){this.value=v;writes.push(v);}
  }}};
  delete globalThis.ResizeObserver;
  const hud={getBoundingClientRect(){reads++;return {height};}};
  const sync=createTacticalHudHeightSync();
  sync.sync(hud);height=108;sync.sync(hud);
  assert.equal(reads,2);
  assert.deepEqual(writes,['91px','108px']);
  sync.dispose();
 }finally{
  if(savedDocument===undefined)delete globalThis.document;
  else globalThis.document=savedDocument;
  if(savedResize===undefined)delete globalThis.ResizeObserver;
  else globalThis.ResizeObserver=savedResize;
 }
});
