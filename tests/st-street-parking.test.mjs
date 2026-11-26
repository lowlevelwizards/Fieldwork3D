import test from 'node:test';import assert from 'node:assert/strict';
import {proposeStreetInfrastructure} from '../src/worldgen/street-infrastructure.ts';
import {proposeStreetParkingLayout} from '../src/worldgen/street-parking.ts';
import {parkingStallCandidates,reservedParkingBay,parkingStallCount} from '../src/worldgen/parking-stalls.ts';
import {STREET_DIMENSIONS as D} from '../src/worldgen/street-standards.ts';
import {VEHICLE_DIMENSIONS} from '../src/worldgen/vehicle-catalog.ts';
function site(side,depth,archetype='retail'){
 const horizontal=side==='north'||side==='south',sign=side==='south'||side==='east'?1:-1;
 const rooms=[{x:450,y:450,w:700,h:700}],bounds={minX:0,minY:0,maxX:1600,maxY:1600};
 const facade=sign===1?1150:450,entrance=horizontal?{x:800,y:facade}:{x:facade,y:800};
 const s={seed:4,archetype,entrySide:side,bounds,rooms,entrance,doors:[],cover:[],exteriorZones:[]};
 const p=proposeStreetInfrastructure(s,undefined,depth+20);
 const zone={id:'arrival-forecourt',kind:'parking',x:horizontal?800:facade+sign*(depth/2+7),y:horizontal?facade+sign*(depth/2+7):800,w:horizontal?720:depth,h:horizontal?depth:720};
 return [{...s,streetInfrastructure:p},zone];
}
test('dimension-driven parking has consistent fixed pitch, separate access and complete aisle',()=>{
 for(const side of ['north','south','east','west'])for(const [depth,kind,mode] of [[180,'retail','parallel'],[270,'retail','perpendicular'],[310,'warehouse','perpendicular']]){
  const [s,z]=site(side,depth,kind),p=proposeStreetParkingLayout(s,z);
  assert.ok(p,side+':'+depth);assert.equal(p.mode,mode);
  assert.equal(p.alongLength/p.count,p.role==='loading'?D.loading.width:mode==='parallel'?D.parallel.length:D.parking.width);
  assert.equal(p.aisleDepth,mode==='parallel'?D.aisle.oneWay:D.aisle.twoWay);
  assert.ok(Math.abs(p.access.alongCenter-p.alongCenter)>p.access.width/2+p.alongLength/2);
  const [w,h]=VEHICLE_DIMENSIONS.sedan;
  assert.equal(parkingStallCandidates({...z,vehicleParking:p},w,h).length,p.count);
  assert.deepEqual(p,proposeStreetParkingLayout(s,z));
 }
});
test('constrained lot is rejected instead of shrinking the circulation aisle',()=>{
 const [s,z]=site('south',90);assert.equal(proposeStreetParkingLayout(s,z),null);
});

test('accessible bay owns a complete adjacent transfer slot within the row',()=>{
 const [s,z]=site('south',270),p=proposeStreetParkingLayout(s,z);
 assert.ok(p&&p.count>=4);
 const r=reservedParkingBay(s,{...z,vehicleParking:p});
 assert.ok(r&&r.transferCenter!==undefined&&r.transferWidth===D.parking.width);
 assert.equal(Math.abs(r.x-r.transferCenter),D.parking.width);
 assert.ok(Math.abs(r.transferCenter-p.alongCenter)+r.transferWidth/2<=p.alongLength/2+.001);
});

test('two complete parking rows share the same aisle without consuming the transfer bay',()=>{
 for(const side of ['north','south','east','west']){
  const [s,z]=site(side,390),p=proposeStreetParkingLayout(s,z);
  assert.ok(p&&p.secondRowCenter!==undefined,side);
  assert.equal(Math.abs(p.rowCenter-p.aisleCenter),p.rowDepth/2+p.aisleDepth/2);
  assert.equal(Math.abs(p.secondRowCenter-p.aisleCenter),p.rowDepth/2+p.aisleDepth/2);
  const zone={...z,vehicleParking:p};
  const [w,h]=VEHICLE_DIMENSIONS.sedan;
  const slots=parkingStallCandidates(zone,w,h);
  assert.equal(slots.length,2*p.count);
  assert.equal(parkingStallCount(zone),slots.length);
  assert.equal(new Set(slots.map(c=>c.x+':'+c.y)).size,slots.length);
 }
});
