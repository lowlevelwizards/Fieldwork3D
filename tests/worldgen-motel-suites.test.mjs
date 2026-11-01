import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';
import {activateSite,route,passable} from '../src/breach-core.ts';

test('every motel suite has a distinct, physically enclosed private bathroom',()=>{
 for(const seed of [8,19,30,41]){
  for(const scale of ['standard','expanded','small']){
   const site=generateSite(seed,scale);
   assert.equal(site.archetype,'motel');
   assert.ok((site.units?.length??0)>=4,seed+' '+scale);
   const known=new Set();
   for(const unit of site.units){
    assert.ok(!known.has(unit.id));known.add(unit.id);
    const rooms=site.rooms.filter(r=>r.unitId===unit.id);
    assert.ok(rooms.some(r=>r.purpose==='guest'),unit.id+' sleeping');
    assert.equal(rooms.filter(r=>r.purpose==='bathroom').length,1,unit.id+' bath');
    const bath=rooms.find(r=>r.purpose==='bathroom');
    assert.ok(site.doors.some(d=>d.id==='BATH-'+unit.id.replace('SUITE-','')),
      unit.id+' missing physical bathroom door');
    assert.ok(bath.w>=32&&bath.h>=40);
   }
   activateSite(site);
   try{assert.ok(passable(site.objective));assert.ok(route(site.spawn[0],site.objective).length>0);}
   finally{activateSite(null);}
   assert.deepEqual(site.units,generateSite(seed,scale).units);
  }
 }
});
test('motel unit contracts reflect private wet facilities rather than a single empty guest zone',()=>{
 const site=generateSite(8,'expanded');
 const verdicts=assessRoomContracts(site);
 assert.ok(verdicts.filter(x=>x.purpose==='bathroom').length>=4);
});
