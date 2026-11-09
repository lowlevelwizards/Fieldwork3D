import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {planPublicStreet} from '../src/worldgen/public-street-layout.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
import {curbRampWedge,CURB_GROUND_LEVELS}
  from '../src/rendering/curb-ramp-wedge.ts';
import {planRearServiceMarks} from '../src/worldgen/rear-service-program.ts';
import {serviceYardEdgeCandidates} from '../src/worldgen/service-yard-layout.ts';
import {reservedParkingBay} from '../src/worldgen/parking-stalls.ts';
import {frontageEdgeCandidates} from '../src/worldgen/outdoor-fixture-policy.ts';

const sides=['north','south','east','west'];
function lot(side='south',archetype='clinic'){
 const northSouth=side==='north'||side==='south';
 const entrance=side==='north'?{x:350,y:230}:
  side==='south'?{x:350,y:430}:
  side==='east'?{x:475,y:330}:{x:225,y:330};
 return {seed:23,archetype,entrySide:side,
  rooms:[{id:'R',kind:'room',purpose:'waiting',x:225,y:230,w:250,h:200}],
  doors:[{id:'FRONT',a:northSouth?
   {x:entrance.x-24,y:entrance.y}:{x:entrance.x,y:entrance.y-24},
   b:northSouth?{x:entrance.x+24,y:entrance.y}:
   {x:entrance.x,y:entrance.y+24}}],
  entrance,cover:[],spawn:[],enemies:[],
  objective:{x:-99,y:-99},extract:{x:-99,y:-99},
  bounds:{minX:0,minY:0,maxX:700,maxY:700}};
}
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.width+b.width)/2-.001&&
 Math.abs(a.y-b.y)<(a.depth+b.depth)/2-.001;
test('curb cuts replace their own slab rather than float on full sidewalk',()=>{
 for(const side of sides){
  const site=addExteriorProperty(lot(side),23);
  const street=planPublicStreet(site);
  assert.ok(street,side);assert.ok(street.curbRamp,side);
  assert.equal(street.curb.length,2,side);
  assert.equal(street.sidewalkPieces.length,2,side);
  assert.ok(street.sidewalkPieces.every(p=>
   !overlap(p,street.curbRamp)),side+' no planar overlap');
  const marks=planPropertySurfaces(site);
  assert.equal(marks.filter(m=>m.kind==='curb-ramp').length,1,side);
  assert.equal(marks.filter(m=>m.kind==='sidewalk').length,2,side);
  assert.equal(marks.filter(m=>m.kind==='crosswalk-stripe').length,0);
 }
});

test('wedge is a genuine six-faced slope meeting asphalt and sidewalk levels',()=>{
 for(const side of sides){
  const site=addExteriorProperty(lot(side),23);
  const ramp=planPublicStreet(site).curbRamp;
  const shape=curbRampWedge(ramp,side);
  assert.equal(shape.vertices.length,24);
  assert.equal(shape.indices.length,36);
  assert.ok(shape.vertices.every(Number.isFinite));
  const ys=Array.from({length:8},(_,i)=>shape.vertices[i*3+1]);
  assert.ok(ys.includes(CURB_GROUND_LEVELS.road));
  assert.ok(ys.includes(CURB_GROUND_LEVELS.sidewalk));
  assert.equal(ys[0],side==='south'||side==='east'?
   CURB_GROUND_LEVELS.sidewalk:CURB_GROUND_LEVELS.road);
 }
});

test('service equipment prioritizes relevant work pads, not random service edges',()=>{
 const zone={id:'rear-property',kind:'service',
  x:240,y:280,w:280,h:110};
 const marks=planRearServiceMarks([zone]);
 for(const [fixture,kind] of [
   ['utility-cabinet','maintenance-bay'],
   ['dumpster','waste-collection'],
   ['pallet','loading-zone']
 ]){
  const work=marks.find(m=>m.kind===kind);
  assert.ok(work,kind);
  const old=serviceYardEdgeCandidates(zone,28,21);
  const ranked=serviceYardEdgeCandidates(zone,28,21,fixture);
  assert.deepEqual([...ranked].sort((a,b)=>a.x-b.x||a.y-b.y),
   [...old].sort((a,b)=>a.x-b.x||a.y-b.y));
  const d=p=>(p.x-work.x)**2+(p.y-work.y)**2;
  assert.ok(ranked.every(p=>d(ranked[0])<=d(p)));
 }
});

test('parking signs use the SAME reserved stall as bay paint on every frontage',()=>{
 for(const side of sides){
  const site=addExteriorProperty(lot(side),23);
  const zone=site.exteriorZones.find(z=>z.id==='arrival-forecourt');
  assert.equal(zone?.kind,'parking');
  const bay=reservedParkingBay(site,zone);
  assert.ok(bay,side);
  const placements=frontageEdgeCandidates(site,zone,'parking-sign',
    side==='east'||side==='west'?11:13,
    side==='east'||side==='west'?13:11);
  assert.equal(placements?.length,1,side);
  assert.equal(side==='east'||side==='west'?
   placements[0].y:placements[0].x,
   side==='east'||side==='west'?bay.y:bay.x);
  const signs=site.cover.filter(p=>p.fixture==='parking-sign');
  const expected=side==='south'?0:side==='east'?1:
    side==='north'?2:3;
  for(const sign of signs)assert.equal(sign.orientation,expected);
  const marks=planPropertySurfaces(site);
  const reserved=marks.find(m=>m.kind==='reserved-parking');
  assert.ok(reserved);
  assert.ok(Math.abs(reserved.x-bay.x)<.1&&
    Math.abs(reserved.y-bay.y)<.1);
 }
});

test('new curved curb appearance does not change movement/collision at all',()=>{
 const source=readFileSync(new URL('../src/rendering/breach-site-exterior-builder.ts',import.meta.url),'utf8');
 assert.match(source,/curbRampWedge\(mark,site\.entrySide\?\?'south'\)/);
 assert.match(source,/new THREE\.BufferGeometry\(\)/);
 assert.match(source,/host\.root\.add\(ramp\)/);
 assert.doesNotMatch(source,/world\.addObstacle\(ramp\)/);
});
