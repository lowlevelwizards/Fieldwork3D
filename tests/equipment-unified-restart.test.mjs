import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {resolveUnifiedCarry,removeManifestContent} from '../src/equipment-unified-placement.ts';
import {captureMissionStart,restoreMissionStartingTeam} from '../src/breach-mission-restart.ts';
import {captureReplayManifest,applyReplayActorIdentity} from '../src/breach-replay-manifest.ts';
const state=()=>{
 const input={belt:'padded-belt',storage:[],items:[{id:'a',kind:'flash',dimensions:{width:2.5,height:5.8,depth:2.5}}]};
 return {input,manifest:resolveUnifiedCarry(input)};
};
test('BT12 restart restores detached starting reservations instead of spent content',()=>{
 const s=newSession(),a=team(s)[0];a.unifiedCarry=state();assert.ok(a.unifiedCarry.manifest.valid);
 const start=captureMissionStart(s,'standard'),before=structuredClone(start);
 a.unifiedCarry={...a.unifiedCarry,manifest:removeManifestContent(a.unifiedCarry.manifest,'a')};
 restoreMissionStartingTeam(s,start);
 assert.deepEqual(a.unifiedCarry,before.squad.find(x=>x.id===a.id).unifiedCarry);
 assert.notEqual(a.unifiedCarry,start.squad.find(x=>x.id===a.id).unifiedCarry);
 assert.deepEqual(start,before);
});
test('BT12 old favorites and replay identity clear stale unified reservations',()=>{
 const s=newSession(),a=team(s)[0],start=captureMissionStart(s,'standard'),old=captureReplayManifest(s);
 a.unifiedCarry=state();restoreMissionStartingTeam(s,start);assert.equal(a.unifiedCarry,undefined);
 a.unifiedCarry=state();applyReplayActorIdentity(s,old);assert.equal(a.unifiedCarry,undefined);
 a.unifiedCarry=state();const manifest=captureReplayManifest(s);a.unifiedCarry=undefined;
 applyReplayActorIdentity(s,manifest);assert.deepEqual(a.unifiedCarry,state());
 assert.notEqual(a.unifiedCarry,manifest.actors.find(x=>x.id===a.id).unifiedCarry);
});
