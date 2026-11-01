import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentTrainingSite} from '../src/equipment-training-range.ts';
import {newSession,stepSession,team,enemies} from '../src/breach-game.ts';
import {WALLS,COVER,activeSite} from '../src/breach-core.ts';
test('25.00 authored practice facility has reproducible targets and doors',()=>{
 const a=equipmentTrainingSite(),b=equipmentTrainingSite();
 assert.deepEqual(a,b);assert.equal(a.training,true);
 assert.equal(a.roomCount,a.rooms.length);
 assert.equal(a.enemies.length,0);
 assert.ok(a.doors.length>=3&&a.cover.length>=5);
 assert.equal(a.spawn.length,4);
});
test('25.00 live tactical simulation cannot automatically finish practice',()=>{
 const site=equipmentTrainingSite();
 const s=newSession(0,undefined,'floor-plan','small',undefined,site);
 assert.equal(activeSite().training,true);
 assert.equal(enemies(s).length,0);
 assert.equal(team(s).length,4);
 assert.equal(WALLS.length,site.walls.length);
 assert.equal(COVER.length,site.cover.length);
 s.phase='running';
 for(let i=0;i<90;i++)stepSession(s,1/30);
 assert.equal(s.phase,'running');
 assert.equal(s.mission,'clear');
});
