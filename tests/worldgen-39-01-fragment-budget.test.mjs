import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planInteriorFragments,INTERIOR_FRAGMENT_LIMIT}
 from '../src/worldgen/interior-fragments.ts';
test('render loops group room fragments rather than quadratic scanning',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(source,/fragmentsByRoom\.get\(room\.id\)/);
 assert.doesNotMatch(source,/fragments\.filter\(f=>f\.roomId===room\.id\)/);
 assert.match(source,/new THREE\.InstancedMesh\(fragmentGeometry,fragmentMaterial,entries\.length\)/);
});
test('mobile fragment budget is a bounded deterministic total',()=>{
 assert.ok(INTERIOR_FRAGMENT_LIMIT<=128);
 const site={seed:15,scenarioStyle:'disrupted',conditionLevel:98,
  rooms:Array.from({length:50},(_,i)=>({
   id:'R'+i,kind:'room',purpose:'storage',x:i*190,y:0,w:180,h:160,tone:0
  })),cover:[],doors:[],windows:[],spawn:[],enemies:[],
  objective:{x:-400,y:-400},extract:{x:-500,y:-500}};
 const a=planInteriorFragments(site);
 assert.ok(a.length<=INTERIOR_FRAGMENT_LIMIT);
 assert.deepEqual(a,planInteriorFragments(site));
});
