import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCirculationTree} from '../src/worldgen/privacy-aware-circulation.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';

const edge=(a,b,score,free=false,eligible=true)=>({a,b,score,free,eligible});
test('a second private door is not a shortcut when a hall is available',()=>{
 const roles=['foyer','bedroom','kitchen','hallway'];
 const options=[
  edge(0,1,-40),edge(1,2,-20),edge(0,3,10),edge(3,2,10)];
 const chosen=chooseCirculationTree(roles,options);
 assert.deepEqual([...chosen],[0,2,3]);
 assert.equal(chosen.has(1),false,'bedroom must not become through-circulation');
 assert.deepEqual([...chooseCirculationTree(roles,options)],[...chosen]);
});

test('privacy preference never disconnects an unavoidable bedroom approach',()=>{
 const roles=['foyer','bedroom','kitchen'];
 assert.deepEqual([...chooseCirculationTree(roles,[edge(0,1,0),edge(1,2,0)])],
  [0,1]);
 assert.deepEqual([...chooseCirculationTree(['lobby','hallway','exam'],
  [edge(0,1,-1,true),edge(1,2,-1)])],[0,1],
  'open corridors must remain physically connected');
});

test('generated physical buildings retain a connected entrance and rooms',()=>{
 const types=['house','retail','office','garage','warehouse','restaurant','clinic'];
 for(const type of types)for(const seed of [1,4,13]){
  const site=compileArchitecturalSite(type,seed,'medium');
  assert.ok(site.doors.some(d=>d.id==='FRONT'),type+' '+seed);
  assert.ok(site.rooms.some(r=>r.kind==='room'));
  assert.deepEqual(site,compileArchitecturalSite(type,seed,'medium'));
 }
});
