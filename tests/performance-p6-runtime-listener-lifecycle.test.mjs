import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBreachRuntimeLoop} from '../src/breach-runtime-loop.ts';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';

const idleEvents=['pointerdown','pointermove','touchstart',
 'touchmove','wheel','keydown'];

test('P6.E: 30 tactical stop/start cycles retain exactly one live listener per input',()=>{
 const old={window:globalThis.window,document:globalThis.document,
  location:globalThis.location,requestAnimationFrame:globalThis.requestAnimationFrame};
 const live=new Map(),counts={added:0,removed:0,frames:0};
 try{
  globalThis.document={body:{append(){}},createElement:()=>({})};
  globalThis.location={search:'?idle3d=30'};
  globalThis.window={
   addEventListener(event,fn){
    if(!live.has(event))live.set(event,new Set());
    live.get(event).add(fn);counts.added++;
   },
   removeEventListener(event,fn){
    assert.ok(live.get(event)?.delete(fn),'detached handler must be identical to installed handler');
    counts.removed++;
   }
  };
  globalThis.requestAnimationFrame=()=>++counts.frames;
  const loop=createBreachRuntimeLoop({boot:parseBreachBootConfig('?idle3d=30')});
  assert.equal(counts.added,0,'construction alone must not subscribe a future game');
  for(let i=0;i<30;i++){
   loop.start();loop.start();
   for(const event of idleEvents)assert.equal(live.get(event)?.size,1,event);
   loop.stop();loop.stop();
   for(const event of idleEvents)assert.equal(live.get(event)?.size,0,event);
  }
  assert.equal(counts.added,180);
  assert.equal(counts.removed,180);
  assert.equal(counts.frames,1,'restart must reuse the already queued RAF');
 }finally{
  for(const key of Object.keys(old))
   if(old[key]===undefined)delete globalThis[key];
   else globalThis[key]=old[key];
 }
});

test('P6.E: non-listening test Window ports avoid duplicate callback subscriptions',()=>{
 const old={window:globalThis.window,document:globalThis.document,
  location:globalThis.location,requestAnimationFrame:globalThis.requestAnimationFrame};
 const active=new Map();
 try{
  globalThis.document={body:{append(){}},createElement:()=>({})};
  globalThis.location={search:'?idle3d=30'};
  globalThis.window={addEventListener:(event,fn)=>{
   const calls=active.get(event)??[];
   calls.push(fn);active.set(event,calls);
  }};
  globalThis.requestAnimationFrame=()=>1;
  const loop=createBreachRuntimeLoop({boot:parseBreachBootConfig('?idle3d=30')});
  for(let i=0;i<30;i++){loop.start();loop.stop();}
  for(const event of idleEvents)assert.equal(active.get(event)?.length,1,event);
 }finally{
  for(const key of Object.keys(old))
   if(old[key]===undefined)delete globalThis[key];
   else globalThis[key]=old[key];
 }
});

test('P6.E remains a presentation listener-only change: authoritative fixed-step and cadence retained',()=>{
 const code=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 assert.match(code,/stepSession\(state,1\/60/);
 assert.match(code,/shouldSubmitIdle3D\(/);
 assert.match(code,/function start\(\):void\{[\s\S]*?attachIdleInputs\(\)/);
 assert.match(code,/function stop\(\):void\{[\s\S]*?detachIdleInputs\(\)/);
});
