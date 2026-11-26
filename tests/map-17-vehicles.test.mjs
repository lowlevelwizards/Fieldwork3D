import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {generateSite} from '../src/breach-site.ts';
import {VEHICLE_FAMILIES,VEHICLE_DIMENSIONS,vehicleFamily} from '../src/worldgen/vehicle-catalog.ts';
import {planPublicStreet,overlapsPublicStreetRoad} from '../src/worldgen/public-street-layout.ts';
import {newSession} from '../src/breach-game.ts';
test('all six vehicle types have independent physical dimensions and catalog previews',()=>{
 const items=assetLibrary();
 for(const id of VEHICLE_FAMILIES){
  const p=propDefinition(id);
  assert.ok(p?.solid&&p.cover==='high');
  assert.deepEqual([p.width,p.depth,p.height],VEHICLE_DIMENSIONS[id]);
  assert.equal(items.find(x=>x.id===id)?.presentation,'bespoke');
 }
});
test('new default sites populate contextual private bays, never retired placeholders',()=>{
 let found=0,occupied=0;
 for(let seed=1;seed<=44;seed++){
  const site=generateSite(seed),other=generateSite(seed);
  assert.deepEqual(site.cover,other.cover);
  const cars=site.cover.filter(o=>vehicleFamily(o.fixture??''));
  if(cars.length)occupied++;
  for(const car of cars){
   found++;assert.notEqual(car.fixture,'vehicle');
   assert.equal(car.low,false);assert.equal(car.vehicleProfile?.version,2);
   const [length,depth]=VEHICLE_DIMENSIONS[car.fixture];
   assert.deepEqual([car.w,car.h],car.orientation%2?[depth,length]:[length,depth]);
   assert.ok(site.exteriorZones.some(z=>z.vehicleParking&&Math.abs(car.x-z.x)+car.w/2<=z.w/2&&Math.abs(car.y-z.y)+car.h/2<=z.h/2));
   assert.equal(overlapsPublicStreetRoad(site,car,planPublicStreet(site)),false);
  }
 }
 assert.ok(occupied>=8&&found>=10,'default generation should produce meaningful occupancy');
});
test('prebuilt historical geometry remains intact on session creation',()=>{
 const site=generateSite(4,'large',undefined,{}, {vehiclePlacement:false});
 assert.ok(site.cover.every(o=>!vehicleFamily(o.fixture??'')));
 const before=JSON.stringify(site);
 const session=newSession(0,site.seed,'exterior-known','large',undefined,site);
 assert.deepEqual(session.site?.cover,site.cover);
 assert.equal(JSON.stringify(site),before);
});
