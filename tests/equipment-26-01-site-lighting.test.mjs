import test from 'node:test';import assert from 'node:assert/strict';
import {planSiteLighting} from '../src/equipment-site-lighting.ts';
import {equipmentTrainingSite} from '../src/equipment-training-range.ts';
test('26.01 seeded lighting is deterministic and fixtures stay in real rooms',()=>{
 const site=equipmentTrainingSite();
 const a=planSiteLighting(site,'night');
 const b=planSiteLighting(site,'night');
 assert.deepEqual(a,b);
 assert.ok(a.fixtures.length>0);
 for(const f of a.fixtures){
  const room=site.rooms.find(r=>r.id===f.roomId);
  assert.ok(room);
  assert.ok(f.p.x>=room.x&&f.p.x<=room.x+room.w);
  assert.ok(f.p.y>=room.y&&f.p.y<=room.y+room.h);
  assert.ok(f.range>0&&f.intensity>0);
 }
});
test('26.01 mains blackout leaves only backup-lit circulation',()=>{
 const site=equipmentTrainingSite();
 const dark=planSiteLighting(site,'blackout');
 const day=planSiteLighting(site,'day');
 assert.ok(day.ambient>dark.ambient);
 assert.ok(day.fixtures.length>=dark.fixtures.length);
 assert.ok(dark.fixtures.every(f=>f.power==='backup'));
 assert.ok(dark.fixtures.every(f=>f.kind==='emergency'));
});
test('26.01 abandoned areas may have outages, bounded by 32 fixtures',()=>{
 const site=equipmentTrainingSite();
 const room=site.rooms[0];
 site.rooms=Array.from({length:75},(_,i)=>({...room,id:'r'+i}));
 site.condition='vacant';
 const program=planSiteLighting(site,'evening');
 assert.ok(program.fixtures.length<=32);
 assert.ok(program.fixtures.length<32);
 assert.ok(program.sources.every(s=>Number.isFinite(s.p.x)&&Number.isFinite(s.p.y)));
});
