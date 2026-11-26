import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeStreetInfrastructure,streetConflicts} from '../src/worldgen/street-infrastructure.ts';
import {STREET_DIMENSIONS as D,STREET_SECTIONS} from '../src/worldgen/street-standards.ts';
import {planPublicStreet} from '../src/worldgen/public-street-layout.ts';
const site=(side,gap)=>{const room={x:200,y:200,w:200,h:200},bounds={minX:200-gap,minY:200-gap,maxX:400+gap,maxY:400+gap};
 const entrance=side==='north'?{x:300,y:200}:side==='south'?{x:300,y:400}:side==='east'?{x:400,y:300}:{x:200,y:300};
 return {seed:4,archetype:'office',entrySide:side,bounds,rooms:[room],entrance,doors:[],cover:[],exteriorZones:[]};};
test('all orientations and street types retain nominal section, cropped only at outer edge',()=>{
 for(const side of ['north','south','east','west'])for(const kind of Object.keys(STREET_SECTIONS))for(const gap of [52,82,130,220,320]){
  const s=site(side,gap),p=proposeStreetInfrastructure(s,kind);
  assert.ok(p,side+':'+kind+':'+gap);
  const spec=STREET_SECTIONS[kind],r=p.frontage.road,b=s.bounds;
  assert.equal(p.nominalLaneWidth,spec.laneWidth);
  assert.equal(p.cropped,p.visibleRoadWidth<spec.lanes*spec.laneWidth);
  assert.equal(p.completeLanes,Math.floor(p.visibleRoadWidth/spec.laneWidth));
  assert.equal(!!p.centerline,spec.lanes===2&&p.visibleRoadWidth>spec.laneWidth+D.paintWidth);
  for(const rect of [r,p.frontage.sidewalk,p.frontage.approach,p.verge,p.shoulder,...p.frontage.curb].filter(Boolean)){
   assert.ok(rect.x-rect.width/2>=b.minX-.001&&rect.x+rect.width/2<=b.maxX+.001);
   assert.ok(rect.y-rect.depth/2>=b.minY-.001&&rect.y+rect.depth/2<=b.maxY+.001);
  }
  if(p.frontage.sidewalk)assert.ok((p.axis==='x'?p.frontage.sidewalk.depth:p.frontage.sidewalk.width)>=D.sidewalk.min);
  assert.equal(side==='south'?r.y+r.depth/2:side==='north'?r.y-r.depth/2:side==='east'?r.x+r.width/2:r.x-r.width/2,side==='south'?b.maxY:side==='north'?b.minY:side==='east'?b.maxX:b.minX);
  assert.deepEqual(p,proposeStreetInfrastructure(s,kind));
 }
});
test('versioned layout remains authoritative after serialization, legacy stays unchanged',()=>{
 const s=site('south',220),before=planPublicStreet(s),p=proposeStreetInfrastructure(s);
 assert.notDeepEqual(p.frontage,before);
 const modern=JSON.parse(JSON.stringify({...s,streetInfrastructure:p}));
 assert.deepEqual(planPublicStreet(modern),p.frontage);
 assert.deepEqual(planPublicStreet(s),before);
 assert.deepEqual(streetConflicts(s,p),[]);
 const r=p.frontage.road;
 assert.deepEqual(streetConflicts({...s,cover:[{id:'old-fixture',x:r.x,y:r.y,w:10,h:10}]},p),['old-fixture']);
 assert.equal(proposeStreetInfrastructure(site('south',40)),null);
});
