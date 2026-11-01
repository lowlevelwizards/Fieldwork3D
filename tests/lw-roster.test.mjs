import test from 'node:test';import assert from 'node:assert/strict';
import {readRoster,initialRoster,applyRosterIdentity,recordRosterMission} from '../src/breach-roster.ts';
import {newSession} from '../src/breach-game.ts';
test('versioned squad identity survives round trips and corrupt saves',()=>{
 const a=initialRoster();
 assert.deepEqual(readRoster(JSON.stringify(a)),a);
 assert.deepEqual(readRoster('not-json'),a);
 assert.deepEqual(readRoster(JSON.stringify({version:99,members:[]})),a);
});
test('mission participation updates identifiable operator records only once per call',()=>{
 const s=newSession(),start=initialRoster();
 applyRosterIdentity(s,start);
 s.phase='won';const saved=recordRosterMission(s,start);
 assert.equal(saved.members.find(m=>m.id==='rook').missions,1);
 assert.equal(start.members.find(m=>m.id==='rook').missions,0);
 assert.equal(saved.members.find(m=>m.id==='ash').missions,0);
});
