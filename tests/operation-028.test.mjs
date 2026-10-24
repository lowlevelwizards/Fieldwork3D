import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newOperation,clearSight,pointBlocked,route,orderMove,
  setPosture,stepOperation,STRUCTURES,
} from '../src/operation-model.ts';
import { establishVegetation } from '../src/vegetation-model.ts';
import { TerrainWater } from '../src/hydrology.ts';

test('weather station buildings are actual obstacles and occlude gunfire',()=>{
  const b=STRUCTURES[0];
  assert.ok(pointBlocked(b.x,b.z));
  assert.equal(clearSight({x:b.x-1.3,z:b.z},{x:b.x+1.3,z:b.z}),false);
  assert.equal(clearSight({x:-4,z:3},{x:-3,z:3}),true);
  assert.equal(clearSight({x:-4,z:3},{x:-4,z:-3}),true,
    'parallel non-intersecting rays must not be treated as blocked');
});
test('waypoints navigate around compound walls without crossing a structure',()=>{
  const path=route({x:-2,z:-.7},{x:2.2,z:-.7});
  assert.ok(path.length>3);
  assert.ok(path.every(p=>!pointBlocked(p.x,p.z)));
  assert.deepEqual(route({x:-2,z:-.7},{x:STRUCTURES[0].x,z:STRUCTURES[0].z}),[]);
});
test('team or single-unit orders are distinct and HOLD cancels movement',()=>{
  const world=newOperation();
  assert.ok(orderMove(world,null,{x:-2,z:2.2}));
  assert.ok(world.actors.filter(a=>a.faction==='contractors')
    .every(a=>a.path.length>0));
  setPosture(world,2,'hold');
  const scout=world.actors.find(a=>a.id===2);
  assert.equal(scout.path.length,0);
  assert.ok(world.actors.find(a=>a.id===1).path.length>0);
  assert.ok(orderMove(world,2,{x:-1.5,z:2}));
  assert.ok(scout.path.length>0);
});
test('operations do not mutate persistent hydrology and produce actual movement',()=>{
  const water=new TerrainWater();
  water.advance(6,.8,.8);
  const before=water.snapshot();
  const world=newOperation(),plants=establishVegetation();
  assert.ok(orderMove(world,1,{x:-2.5,z:2},water));
  const original={x:world.actors[0].x,z:world.actors[0].z};
  for(let i=0;i<50;i++)stepOperation(world,.05,plants,water);
  assert.ok(Math.hypot(original.x-world.actors[0].x,
    original.z-world.actors[0].z)>.08);
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});
test('collecting field logs and extracting wins only with a living carrier',()=>{
  const world=newOperation();
  const lead=world.actors[0];
  lead.x=world.intel.x;lead.z=world.intel.z;
  stepOperation(world,.01,[]);
  assert.equal(world.phase,'extract');
  assert.equal(world.carrier,lead.id);
  lead.x=world.extraction.x;lead.z=world.extraction.z;
  stepOperation(world,.01,[]);
  assert.equal(world.phase,'won');
  assert.equal(orderMove(world,null,{x:0,z:0}),false);
});
test('fallen carrier drops logs and defeat requires all contractors down',()=>{
  const world=newOperation();
  world.actors[0].x=world.intel.x;world.actors[0].z=world.intel.z;
  stepOperation(world,.01,[]);
  assert.equal(world.phase,'extract');
  world.actors[0].health=0;
  stepOperation(world,.01,[]);
  assert.equal(world.phase,'collect');
  assert.equal(world.carrier,null);
  world.actors.filter(a=>a.faction==='contractors').forEach(a=>a.health=0);
  stepOperation(world,.01,[]);
  assert.equal(world.phase,'lost');
});
test('AI can acquire nearby visible contacts but cannot shoot through walls',()=>{
  const world=newOperation();
  const sentry=world.actors.find(a=>a.id===4);
  const lead=world.actors.find(a=>a.id===1);
  sentry.x=0;sentry.z=2.2;
  lead.x=-1;lead.z=2.2;
  sentry.cooldown=0;
  stepOperation(world,.09,[]);
  assert.ok(sentry.alert>0);
  assert.ok(sentry.shots>0);
  const walled=newOperation();
  const enemy=walled.actors.find(a=>a.id===4);
  const ally=walled.actors.find(a=>a.id===1);
  const wall=STRUCTURES[0];
  enemy.x=wall.x+1.5;enemy.z=wall.z;
  ally.x=wall.x-1.5;ally.z=wall.z;
  for(const other of walled.actors){
    if(other.id===4||other.id===1)continue;
    other.health=0;
  }
  stepOperation(walled,.09,[]);
  assert.equal(enemy.shots,0);
  assert.equal(ally.shots,0);
});
test('mission interface exists as a separate mobile browser entrypoint',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../operation.html',import.meta.url),'utf8');
  const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/operation-main.ts',import.meta.url),'utf8');
  assert.ok(html.includes('operationCanvas'));
  assert.ok(html.includes('WHOLE TEAM'));
  assert.ok(vite.includes("operation: 'operation.html'"));
  assert.ok(app.includes('stepOperation('));
  assert.ok(app.includes('orderMove('));
});
