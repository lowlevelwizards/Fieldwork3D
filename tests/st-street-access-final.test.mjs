import test from 'node:test';import assert from 'node:assert/strict';
import {proposeStreetInfrastructure} from '../src/worldgen/street-infrastructure.ts';
import {attachCurbsideParking,clearStreetAccess} from '../src/worldgen/street-access-final.ts';
import {parkingStallCandidates} from '../src/worldgen/parking-stalls.ts';
test('curbside parking uses a dedicated full-width lane, not a travel lane or driveway',()=>{
 for(const entrySide of ['north','south','east','west']){
  const horizontal=entrySide==='north'||entrySide==='south';
  const site={seed:4,archetype:'office',entrySide,bounds:{minX:0,minY:0,maxX:1200,maxY:1200},rooms:[{x:450,y:450,w:300,h:300}],doors:[],entrance:{x:600,y:600},cover:[],exteriorZones:[]};
  const p=proposeStreetInfrastructure(site,'commercial',80,true);
  assert.ok(p.curbside);assert.equal(p.completeLanes,2);
  const next=attachCurbsideParking({...site,streetInfrastructure:p});assert.ok(next);
  const across=horizontal?'y':'x';
  assert.equal(Math.abs(p.curbside[across]-p.frontage.road[across]),(p.visibleRoadWidth+52)/2);
  assert.ok(next.exteriorZones.every(z=>z.vehicleParking.mode==='parallel'));
  assert.ok(next.exteriorZones.flatMap(z=>parkingStallCandidates(z,96,39)).length>0);
  assert.ok(clearStreetAccess(next));
  const a=p.frontage.approach;
  assert.equal(clearStreetAccess({...next,cover:[{x:a.x,y:a.y,w:10,h:10}]}),false);
 }
});
