import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {ARCHITECTURAL_FAMILIES} from '../src/worldgen/architectural-program.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
import {intelPassable,initialIntel} from '../src/breach-intel.ts';
test('new architectural compiler creates real varied and connected physical environments',()=>{
 let diverse=0;
 const observed=new Set();
 for(let seed=1;seed<=66;seed++){
  const a=generateSite(seed,'expanded'),b=generateSite(seed,'expanded');
  assert.deepEqual(a,b);
  if(!a.programLocked)continue;
  diverse++;observed.add(a.archetype);
  assert.ok(a.planFamily);
  assert.ok(a.rooms.some(r=>!!r.zoneId));
  assert.equal(a.doors.find(d=>d.id==='FRONT')!==undefined,true);
  assert.ok(a.doors.every(d=>Math.abs(Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y)-48)<.001));
  const front=a.doors.find(d=>d.id==='FRONT'),p=front&&{
   x:(front.a.x+front.b.x)/2,y:(front.a.y+front.b.y)/2-19};
  assert.ok(p&&a.rooms.some(r=>['waiting','reception','lobby',
   'living','dining','sales','aisle','loading'].includes(r.purpose)&&
   p.x>r.x&&p.x<r.x+r.w&&p.y>r.y&&p.y<r.y+r.h));
  activateSite(a);
  try{
   for(const p of [...a.spawn,a.objective,...a.enemies,a.extract])
    assert.ok(passable(p),'invalid placement '+seed);
   assert.ok(route(a.spawn[0],a.objective).length,'objective unreachable '+seed);
   const intel=initialIntel('floor-plan',a,a.doors);
   assert.ok(intelPassable(a.objective,intel),'intel cannot route to objective '+seed);
  }finally{activateSite(null);}
 }
 assert.ok(diverse>25,'blueprint generator should cover the majority of expanded seeds');
 assert.ok(observed.size>=8,'building families must vary');
 assert.equal(ARCHITECTURAL_FAMILIES.length,11);
});
