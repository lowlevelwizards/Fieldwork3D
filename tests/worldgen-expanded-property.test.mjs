import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('expanded maps preserve door widths, mission geometry and larger playable bounds',()=>{
 let larger=0,compactArea=0,expandedArea=0;
 for(let seed=1;seed<=70;seed++){
  const base=generateSite(seed),large=generateSite(seed,'expanded');
  assert.deepEqual(large,generateSite(seed,'expanded'));
  assert.deepEqual(base,generateSite(seed));
  if(large.scale!=='expanded')continue;
  larger++;
  assert.ok(large.bounds.maxX>640);
  assert.equal(large.archetype,base.archetype);
  assert.ok(large.rooms.length>=8&&base.rooms.length>=8);
  expandedArea+=large.rooms.reduce((n,r)=>n+r.w*r.h,0);
  compactArea+=base.rooms.reduce((n,r)=>n+r.w*r.h,0);
  assert.ok(large.doors.every(d=>d.kind==='shutter'?Math.hypot(d.a.x-d.b.x,d.a.y-d.b.y)>=80:
    Math.abs(Math.hypot(d.a.x-d.b.x,d.a.y-d.b.y)-48)<.001));
  activateSite(large);
  try{
   for(const p of [...large.spawn,...large.enemies,large.objective,large.extract])
    assert.ok(passable(p),'blocked actor/objective '+seed);
   assert.ok(route(large.spawn[0],large.objective).length,'unreachable mission '+seed);
  }finally{activateSite(null);}
 }
 assert.ok(larger>=12,'not enough expanded layouts');
 assert.ok(expandedArea>compactArea*1.14,'expanded floorplans should carry more overall area');
});
