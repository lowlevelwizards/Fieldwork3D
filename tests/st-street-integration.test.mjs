import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {streetConflicts} from '../src/worldgen/street-infrastructure.ts';
import {planPublicStreet} from '../src/worldgen/public-street-layout.ts';
import {vehicleFamily} from '../src/worldgen/vehicle-catalog.ts';
test('ST pilot preserves canonical mission semantics, existing fleet density and public clearance',()=>{
 let accepted=0;
 for(const seed of [1,4,5,6,7,9,10,11]){
  const context={mission:'rescue',enableCivilians:true};
  const legacy=generateSite(seed,'large',undefined,context,{streetInfrastructure:false}),pilot=generateSite(seed,'large',undefined,context);
  assert.equal(legacy.streetInfrastructure,undefined);
  for(const key of ['rooms','walls','doors','windows','spawn','enemies','objective','extract','encounter','identity','planFamily'])assert.deepEqual(pilot[key],legacy[key],seed+':'+key);
  const cars=s=>s.cover.filter(c=>vehicleFamily(c.fixture??'')).length;
  assert.ok(cars(pilot)>=cars(legacy),String(seed));
  if(pilot.streetInfrastructure){accepted++;assert.deepEqual(streetConflicts(pilot,pilot.streetInfrastructure),[]);assert.deepEqual(planPublicStreet(JSON.parse(JSON.stringify(pilot))),pilot.streetInfrastructure.frontage);}
 }
 assert.ok(accepted>0,'at least one real site should accept a safe street pilot');
});
