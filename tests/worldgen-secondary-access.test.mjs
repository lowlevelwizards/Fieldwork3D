import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('service and staff entrances are real exterior door cuts, not fake hotspots',()=>{
 let accessible=0;
 for(const kind of ['garage','warehouse','restaurant','motel','clinic','house']){
  for(let seed=0;seed<12;seed++){
   const s=compileArchitecturalSite(kind,seed);
   const front=s.doors.find(d=>d.id==='FRONT');
   assert.ok(front);
   const service=s.doors.find(d=>d.id==='SERVICE');
   if(!service)continue;
   accessible++;
   assert.ok(Math.abs(Math.hypot(service.a.x-service.b.x,
     service.a.y-service.b.y)-48)<.001);
   assert.ok(Math.hypot((service.a.x+service.b.x)/2-
    (front.a.x+front.b.x)/2,(service.a.y+service.b.y)/2-
    (front.a.y+front.b.y)/2)>104);
  }
 }
 assert.ok(accessible>=12,'service doors should be available across facility types');
});
