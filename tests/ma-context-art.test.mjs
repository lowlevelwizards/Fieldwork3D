import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_WITNESSES,FIXTURE_WITNESSES,floorWitness,fixtureWitness} from '../src/wall-material-lab-context.ts';
import {conditionFloorPixels} from '../src/worldgen/condition-visual.ts';
import {PIXEL_SURFACES,pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {materialProfile} from '../src/rendering/pixel-profiles.ts';
import {planObjectWear} from '../src/worldgen/object-wear.ts';
test('material swatches retain profile contrast limits and opaque repeatable tiles',()=>{
 for(const kind of PIXEL_SURFACES){
  const a=pixelPattern(kind,4);
  assert.deepEqual(a,pixelPattern(kind,4),kind);
  assert.equal(a.length,4096);
  assert.ok(a.every((v,i)=>i%4===3?v===255:v>=255-materialProfile(kind).maxDarkening-2),kind);
 }
});
test('floor and fixture witnesses are deterministic, opaque and materially aged',()=>{
 for(const [list,fn] of [[FLOOR_WITNESSES,floorWitness],[FIXTURE_WITNESSES,fixtureWitness]]){
  for(let i=0;i<list.length;i++){
   const clean=fn(i,0,1),aged=fn(i,100,1);
   assert.equal(aged.bytes.length,64*64*4);
   assert.notDeepEqual(clean.bytes,aged.bytes,list[i].name);
   assert.deepEqual(aged,fn(i,100,1),list[i].name);
   assert.ok(aged.bytes.every((v,i)=>i%4!==3||v===255));
  }
 }
});
test('floor condition increases monotonically, and intact fixtures alone influence buildup',()=>{
 const room={id:'r',x:0,y:0,w:96,h:96,kind:'room',purpose:'workshop',tone:0};
 const site={seed:23,archetype:'garage',rooms:[room],doors:[],walls:[],cover:[]};
 const alpha=b=>b.reduce((n,v,i)=>n+(i%4===3?v:0),0);
 const levels=[0,25,50,75,100].map(l=>alpha(conditionFloorPixels(site,room,l)));
 assert.equal(levels[0],0);assert.ok(levels.slice(1).every((v,i)=>v>levels[i]));
 const f={fixture:'vehicle-lift',x:40,y:40,w:20,h:20};
 assert.ok(alpha(conditionFloorPixels({...site,cover:[f]},room,100))>levels[4]);
 assert.equal(alpha(conditionFloorPixels({...site,cover:[{...f,destroyed:true}]},room,100)),levels[4]);
});
test('retained object wear keeps stable placement and type when condition changes',()=>{
 const site={seed:23,cover:Array.from({length:50},(_,i)=>({fixture:'tool-chest',x:i*30,y:0,w:20,h:16})),walls:[],doors:[]};
 const a=planObjectWear({...site,conditionLevel:50}),b=planObjectWear({...site,conditionLevel:100});
 assert.ok(a.length>0&&b.length>=a.length);
 let shared=0;
 for(const m of a){const n=b.find(x=>x.id===m.id);if(!n)continue;shared++;assert.equal(n.kind,m.kind);assert.equal(n.u,m.u);assert.equal(n.v,m.v);assert.ok(n.size>=m.size);}
 assert.ok(shared>0);
 assert.ok(!planObjectWear({...site,conditionLevel:100,cover:site.cover.map(x=>({...x,destroyed:true}))}).length);
});
