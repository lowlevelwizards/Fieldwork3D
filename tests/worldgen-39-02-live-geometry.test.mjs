import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';

test('all eleven archetypes keep finite, matching live door/collision geometry',()=>{
 for(let seed=0;seed<11;seed++){
  const site=generateSite(seed,'small');
  assert.ok(site.rooms.length>=3,seed);
  assert.ok(site.doors.some(d=>d.id==='FRONT'),seed);
  assert.equal(new Set(site.doors.map(d=>d.id)).size,site.doors.length);
  for(const door of site.doors){
   const len=Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y);
   assert.ok(len>35&&len<135,seed+' '+door.id+' opening width');
   if(door.kind==='sliding'||door.kind==='shutter')continue;
   for(const fraction of [.35,.75,1]){
    const leaf=doorLeafSegment({...door,open:true,openFraction:fraction});
    for(const p of [leaf.a,leaf.b])
     assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
   }
  }
  assert.ok(site.cover.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)&&
   o.w>0&&o.h>0),seed+' invalid physical fixture');
 }
});
test('new site marking and furnishing pipelines are stable across live regeneration',()=>{
 for(const seed of [2,6,10]){
  const a=generateSite(seed,'small'),b=generateSite(seed,'small');
  assert.deepEqual(a.doors,b.doors);
  assert.deepEqual(a.cover,b.cover);
  assert.deepEqual(planPropertySurfaces(a),planPropertySurfaces(b));
 }
});
