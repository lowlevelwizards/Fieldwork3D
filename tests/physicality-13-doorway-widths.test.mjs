import test from 'node:test';
import assert from 'node:assert/strict';
import {ordinaryDoorOpeningWidth,INTERIOR_DOOR_OPENING_WIDTH,
 ENTRY_DOOR_OPENING_WIDTH} from '../src/breach-door-proportions.ts';
import {generateJunctionSite} from '../src/breach-junction-site.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {activateSite,passable,OPERATOR_RADIUS,initialDoors,WALLS}
 from '../src/breach-core.ts';
const width=d=>Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y);
const center=d=>({x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2});
test('single doors get a genuinely narrower silhouette, but retain clear actor room',()=>{
 assert.equal(INTERIOR_DOOR_OPENING_WIDTH,36);
 assert.equal(ENTRY_DOOR_OPENING_WIDTH,42);
 assert.ok(INTERIOR_DOOR_OPENING_WIDTH>=2*OPERATOR_RADIUS+16);
 assert.equal(ordinaryDoorOpeningWidth('D31'),36);
 assert.equal(ordinaryDoorOpeningWidth('COURT-2'),42);
 assert.equal(ordinaryDoorOpeningWidth('FRONT'),42);
});
test('the legacy practice openings and their authoritative wall cuts now agree',()=>{
 activateSite(null);
 const doors=initialDoors();
 assert.equal(width(doors.find(d=>d.id==='FRONT')),42);
 assert.equal(width(doors.find(d=>d.id==='INNER')),36);
 for(const d of doors)assert.equal(passable(center(d)),true,
  'no invisible wall should remain across '+d.id);
 assert.ok(WALLS.some(w=>w.a.x===282&&w.a.y===532)||WALLS.some(w=>w.b.x===282&&w.b.y===532));
});
test('junction layouts cut real 36/42-unit door gaps through structural walls',()=>{
 for(const seed of [2,11,26]){
  const site=generateJunctionSite(seed);
  for(const d of site.doors)
   assert.equal(width(d),ordinaryDoorOpeningWidth(d.id),d.id);
  activateSite(site);
  try{
   for(const d of site.doors)assert.ok(passable(center(d)),
    'operator center should fit into '+d.id+' on seed '+seed);
  }finally{activateSite(null);}
 }
});
test('building compiler keeps roomier front, slim interior, and intentional double doors',()=>{
 for(const kind of ['house','restaurant','clinic']){
  const site=compileArchitecturalSite(kind,23,'small');
  const normal=site.doors.filter(d=>d.kind!=='shutter'&&!d.pairedWith);
  assert.ok(normal.length>0,kind+' produced no single doors');
  assert.ok(normal.some(d=>d.id==='FRONT'),kind+' lacks public entrance');
  for(const d of normal)assert.equal(width(d),
   ordinaryDoorOpeningWidth(d.id),kind+' '+d.id);
 }
});
