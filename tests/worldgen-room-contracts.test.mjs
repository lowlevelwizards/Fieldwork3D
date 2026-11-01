import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOM_CONTRACTS,assessRoomContracts} from '../src/worldgen/room-contracts.ts';
import {generateSite} from '../src/breach-site.ts';

test('every active authored functional room role has a contract',()=>{
 for(let seed=1;seed<=66;seed++){
  const site=generateSite(seed);
  for(const room of site.rooms)
   assert.ok(ROOM_CONTRACTS[room.purpose??''],room.purpose+' seed '+seed);
 }
});
test('functional contracts evaluate connected zones and alternatives',()=>{
 const site={rooms:[
  {id:'a',zoneId:'k',x:0,y:0,w:100,h:100,kind:'room',purpose:'kitchen'},
  {id:'b',zoneId:'k',x:100,y:0,w:100,h:100,kind:'room',purpose:'kitchen'}],
  cover:[
   {x:30,y:30,fixture:'counter'},{x:70,y:30,fixture:'fridge'},
   {x:130,y:30,fixture:'stove'},{x:170,y:30,fixture:'sink'}]};
 const [result]=assessRoomContracts(site);
 assert.deepEqual(result.roomIds,['a','b']);
 assert.equal(result.complete,true);
 const [incomplete]=assessRoomContracts({...site,cover:site.cover.filter(o=>o.fixture!=='sink')});
 assert.equal(incomplete.complete,false);
 assert.deepEqual(incomplete.missing,[['sink','dish-station']]);
});
