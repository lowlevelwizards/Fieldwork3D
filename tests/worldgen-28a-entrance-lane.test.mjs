import test from 'node:test';
import assert from 'node:assert/strict';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {arrivalAccessLane,overlapsArrivalLane}
 from '../src/worldgen/property-access-lane.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
import {generateSite} from '../src/breach-site.ts';

function parcel(entrySide='south',archetype='house'){
 const r={id:'home',kind:'room',purpose:'living',x:225,y:230,w:250,h:200};
 const at=entrySide==='south'?{x:350,y:430}:
  entrySide==='north'?{x:350,y:230}:
  entrySide==='east'?{x:475,y:330}:{x:225,y:330};
 const a=entrySide==='south'||entrySide==='north'?
  {x:at.x-24,y:at.y}:{x:at.x,y:at.y-24};
 const b=entrySide==='south'||entrySide==='north'?
  {x:at.x+24,y:at.y}:{x:at.x,y:at.y+24};
 return {seed:11,archetype,entrySide,rooms:[r],cover:[],
  doors:[{id:'FRONT',a,b}],bounds:{minX:0,minY:0,maxX:700,maxY:700},
  entrance:at,spawn:[],enemies:[],
  objective:{x:-100,y:-100},extract:{x:-100,y:-100}};
}
test('every oriented arrival zone touches the facade rather than floating mid-setback',()=>{
 for(const side of ['south','north','east','west']){
  const s=addExteriorProperty(parcel(side),11);
  const zone=s.exteriorZones.find(z=>z.id==='arrival-forecourt');
  assert.ok(zone,side);
  const r=s.rooms[0];
  const gap=side==='south'?zone.y-zone.h/2-(r.y+r.h):
   side==='north'?r.y-(zone.y+zone.h/2):
   side==='east'?zone.x-zone.w/2-(r.x+r.w):
   r.x-(zone.x+zone.w/2);
  assert.ok(gap>=0&&gap<=10,side+' gap '+gap);
  const lane=arrivalAccessLane(s,zone);
  assert.ok(lane);
  assert.ok(s.cover.every(o=>!overlapsArrivalLane(s,zone,o)),
    side+' outside objects obstruct the doorway corridor');
  assert.deepEqual(s,addExteriorProperty(parcel(side),11));
 }
});
test('industrial arrivals include a visible walk lane beside vehicle access',()=>{
 const s=addExteriorProperty(parcel('south','garage'),17);
 const zone=s.exteriorZones.find(z=>z.id==='arrival-forecourt');
 const lane=arrivalAccessLane(s,zone);
 const paths=planPropertySurfaces(s).filter(m=>m.zoneId===zone.id&&m.kind==='path');
 assert.ok(paths.length>0);
 assert.equal(paths[0].x,lane.x);
});
test('actual generated sites protect door approaches at different footprints',()=>{
 for(const seed of [1,3,7,8,14,21]){
  const s=generateSite(seed,'small');
  const front=s.exteriorZones.find(z=>z.id==='arrival-forecourt');
  assert.ok(front);
  const lane=arrivalAccessLane(s,front);
  assert.ok(lane);
  // Outside objects may not occupy the pedestrian access strip; indoor
  // fixtures remain governed by the building's separate route solver.
  const outdoors=s.cover.filter(o=>!s.rooms.some(r=>
    o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h));
  assert.ok(outdoors.every(o=>!overlapsArrivalLane(s,front,o)),
   'blocked front lane seed '+seed);
 }
});
