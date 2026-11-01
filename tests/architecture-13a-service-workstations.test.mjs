import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary,assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {generateSite} from '../src/breach-site.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';
test('all three service workstations have canonical collision and bespoke showroom models',()=>{
 for(const [id,width] of [['reception-desk',56],['transaction-counter',52],['parts-counter',58]]){
  const prop=propDefinition(id);assert.ok(prop);assert.equal(prop.width,width);
  assert.ok(prop.solid);assert.equal(prop.cover,'high');
  assert.equal(assetLibrary().find(x=>x.id===id)?.presentation,'bespoke');
 }
 assert.deepEqual(assetLibraryProblems(),[]);
});
test('contextual service counters participate in seeded functional room furnishing',()=>{
 const counts=new Map([['reception-desk',0],['transaction-counter',0],['parts-counter',0]]);
 for(let seed=1;seed<=143;seed++){
  const site=generateSite(seed);
  for(const c of site.cover){
   if(!counts.has(c.fixture))continue;
   counts.set(c.fixture,counts.get(c.fixture)+1);
   const room=site.rooms.find(r=>r.kind==='room'&&
     c.x>r.x&&c.x<r.x+r.w&&c.y>r.y&&c.y<r.y+r.h);
   assert.ok(room,'counter outside room');
   assert.ok(propDefinition(c.fixture).rooms.includes(room.purpose),'counter in wrong room');
  }
 }
 assert.ok(counts.get('reception-desk')>0);
 assert.ok(counts.get('transaction-counter')>0);
 assert.ok(counts.get('parts-counter')>0);
});
