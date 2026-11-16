import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAINING_LAYOUTS,DEFAULT_TRAINING_CONFIG,normalizeTrainingConfig}
 from '../src/training/training-courses.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {newSession,team,enemies,stepSession}
 from '../src/breach-game.ts';
test('all killhouse variants are stable, physical and seeded',()=>{
 for(const layout of TRAINING_LAYOUTS){
  const config={...DEFAULT_TRAINING_CONFIG,layout};
  const a=buildTrainingSite(config),b=buildTrainingSite(config);
  assert.deepEqual(a,b,layout);
  assert.equal(a.training,true);
  assert.equal(a.roomCount,a.rooms.length);
  assert.equal(a.spawn.length,4);
  assert.ok(a.walls.length>=12);
  assert.ok(a.doors.length>=7);
  assert.equal(a.enemies.length,0);
  for(const d of a.doors){
   assert.ok(a.walls.every(w=>JSON.stringify(w)!==JSON.stringify(d)),d.id);
  }
 }
});
test('killhouse options change physical course without random generation',()=>{
 const base={...DEFAULT_TRAINING_CONFIG};
 const open=buildTrainingSite({...base,doors:'open'});
 assert.ok(open.doors.every(d=>d.open));
 const none=buildTrainingSite({...base,targetDensity:'none'});
 assert.equal(none.cover.filter(o=>o.fixture==='target-plate').length,0);
 const dense=buildTrainingSite({...base,targetDensity:'dense'});
 assert.equal(dense.cover.filter(o=>o.fixture==='target-plate').length,6);
 assert.equal(dense.cover.filter(o=>o.fixture==='target-plate').length,
  new Set(dense.cover.filter(o=>o.fixture==='target-plate').map(o=>o.id)).size);
 assert.equal(buildTrainingSite({...base,activity:'range'}).name,'FIELD EQUIPMENT RANGE');
});
test('course loader uses authoritative live session and never auto-wins',()=>{
 const site=buildTrainingSite({...DEFAULT_TRAINING_CONFIG});
 const s=newSession(0,undefined,'full-view','small','hold',site,
  {enableCivilians:false});
 assert.equal(s.site?.training,true);
 assert.equal(team(s).length,4);
 assert.equal(enemies(s).length,0);
 s.phase='running';
 for(let i=0;i<30;i++)stepSession(s,1/60);
 assert.equal(s.phase,'running');
});
test('config invalid inputs fall back to stable presets',()=>{
 assert.deepEqual(normalizeTrainingConfig({}),DEFAULT_TRAINING_CONFIG);
 assert.equal(normalizeTrainingConfig({squadSize:2}).squadSize,2);
});
