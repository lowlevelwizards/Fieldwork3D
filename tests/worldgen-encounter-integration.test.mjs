import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
test('generated site and session agree on encounter actors',()=>{
 const site=generateSite(41,'small',undefined,{mission:'capture',risk:3});
 assert.equal(site.encounter?.mission,'capture');
 assert.equal(site.encounter?.risk,3);
 assert.equal(site.enemies.length,site.encounter?.actors.length);
 const session=newSession(0,41,'floor-plan','small','capture',site);
 assert.equal(enemies(session).length,site.encounter?.actors.length);
 assert.deepEqual(enemies(session).map(a=>a.p),site.enemies);
 activateSite(null);
});
