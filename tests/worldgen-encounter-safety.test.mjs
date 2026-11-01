import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {clearOfInsertion,roomOccupancyCapacity,exteriorSpawnAllowed,
 INTERIOR_INSERTION_CLEARANCE,EXTERIOR_INSERTION_CLEARANCE}
 from '../src/worldgen/encounter-spawn-safety.ts';

test('deployment clearance applies to every operator, not only the first',()=>{
 const site={spawn:[{x:0,y:0},{x:80,y:0},{x:0,y:80},{x:80,y:80}],
  entrance:{x:40,y:50},extract:{x:40,y:0}};
 assert.equal(clearOfInsertion(site,{x:90,y:86}),false);
 assert.equal(clearOfInsertion(site,{x:300,y:300}),true);
 assert.ok(EXTERIOR_INSERTION_CLEARANCE>INTERIOR_INSERTION_CLEARANCE);
 const forecourt={id:'arrival-forecourt',x:300,y:300,w:100,h:100};
 const rear={...forecourt,id:'rear-property'};
 assert.equal(exteriorSpawnAllowed(site,forecourt,{x:300,y:300}),false);
 assert.equal(exteriorSpawnAllowed(site,rear,{x:300,y:300}),true);
});
test('small furnished rooms cannot host oversized gunman stacks',()=>{
 const room={id:'office',kind:'room',x:0,y:0,w:120,h:120};
 const cover=[{x:55,y:55,w:45,h:45}];
 assert.equal(roomOccupancyCapacity(room,cover),1);
 assert.ok(roomOccupancyCapacity({...room,w:230,h:230},[])<=3);
});
test('seeded encounters preserve insertion space and per-room occupancy',()=>{
 for(const seed of [11,32,53,74]){
  const a=generateSite(seed,'large',undefined,{risk:3,premise:'defensive'});
  const b=generateSite(seed,'large',undefined,{risk:3,premise:'defensive'});
  assert.deepEqual(a.enemies,b.enemies);
  assert.ok(a.enemies.length>=2);
  const counts=new Map();
  for(const actor of a.encounter.actors){
   const p=actor.position;
   const isExterior=actor.zoneId?.startsWith('exterior:')??false;
   assert.ok(clearOfInsertion(a,p,isExterior),'entry violation seed '+seed);
   if(isExterior){
    const zone=a.exteriorZones.find(z=>'exterior:'+z.id===actor.zoneId);
    assert.ok(zone&&exteriorSpawnAllowed(a,zone,p),'exterior violation seed '+seed);
   }else{
    const room=a.rooms.find(r=>r.kind==='room'&&
      p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
    assert.ok(room,'interior actor lacks room seed '+seed);
    counts.set(room.id,(counts.get(room.id)??0)+1);
   }
  }
  for(const [id,count] of counts){
   const room=a.rooms.find(r=>r.id===id);
   assert.ok(count<=roomOccupancyCapacity(room,a.cover),
     'overcrowded '+id+' seed '+seed+': '+count);
  }
 }
});
