import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {ARCHITECTURAL_FAMILIES} from '../src/worldgen/architectural-program.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
import {intelPassable,initialIntel} from '../src/breach-intel.ts';
import {ordinaryDoorOpeningWidth} from '../src/breach-door-proportions.ts';
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
  const badDoors=a.doors.filter(d=>{
   const actual=Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y);
   const expected=d.kind==='shutter'?80:
     d.pairedWith?48:ordinaryDoorOpeningWidth(d.id);
   return d.kind==='shutter'?actual<80:Math.abs(actual-expected)>.001;
  }).map(d=>({id:d.id,kind:d.kind,pairedWith:d.pairedWith,
    actual:Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y),
    expected:d.kind==='shutter'?'at least 80':
      d.pairedWith?48:ordinaryDoorOpeningWidth(d.id)}));
  assert.deepEqual(badDoors,[],'seed '+seed+' '+a.archetype);
  const front=a.doors.find(d=>d.id==='FRONT');
  assert.ok(front);
  const mid={x:(front.a.x+front.b.x)/2,y:(front.a.y+front.b.y)/2};
  const dx=front.b.x-front.a.x,dy=front.b.y-front.a.y;
  const len=Math.hypot(dx,dy);
  // Frontage now faces any cardinal direction, not always the old south.
  const interiorSamples=[-1,1].map(sign=>({
    x:mid.x-sign*dy/len*19,y:mid.y+sign*dx/len*19}));
  assert.ok(a.rooms.some(r=>['foyer','vestibule','mudroom','waiting','reception','lobby',
   'living','dining','sales','checkout','aisle','loading','service','hallway'].includes(r.purpose)&&
   interiorSamples.some(p=>p.x>r.x&&p.x<r.x+r.w&&
    p.y>r.y&&p.y<r.y+r.h)),
    'front-facing public access seed '+seed+' archetype '+a.archetype+
    ' front '+JSON.stringify(mid)+' samples '+JSON.stringify(interiorSamples)+
    ' neighboring rooms '+JSON.stringify(a.rooms.filter(r=>
      Math.abs(r.x-mid.x)<100&&Math.abs(r.y-mid.y)<100).map(r=>({
       id:r.id,purpose:r.purpose,x:r.x,y:r.y,w:r.w,h:r.h}))));
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
