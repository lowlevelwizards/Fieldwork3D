import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
test('E5-B7 a real rescue session has exactly one neutral target',()=>{
 const site=generateSite(27,'small',undefined,
   {seed:27,mission:'rescue',premise:'routine'});
 const legacy=newSession(0,27,'floor-plan','small','rescue',site);
 const migrated=newSession(0,27,'floor-plan','small','rescue',site,
   {enableCivilians:true});
 assert.equal(legacy.civilians.length,0);
 const people=migrated.civilians.filter(c=>c.rescueTarget);
 assert.equal(people.length,1);
 assert.equal(people[0].role,'rescue');
 assert.deepEqual(people[0].p,migrated.rescue.p);
 assert.equal(migrated.missionType,'rescue');
 assert.equal(migrated.mission,'secure');
});
