import test from 'node:test';import assert from 'node:assert/strict';
import {initialRoster,applyRosterIdentity,recordRosterMission,
 resupplyRoster,equipRoster} from '../src/breach-roster.ts';
import {newSession,team} from '../src/breach-game.ts';
test('weapon and remaining rounds survive mission end and reload',()=>{
 const a=newSession(),rook=team(a)[0];
 rook.weapon='smg';rook.magazine=3;rook.reserve=7;
 a.phase='won';
 const saved=recordRosterMission(a,initialRoster());
 const b=newSession();applyRosterIdentity(b,saved);
 assert.equal(team(b)[0].weapon,'smg');
 assert.equal(team(b)[0].magazine,3);
 assert.equal(team(b)[0].reserve,7);
 assert.equal(team(b)[0].spareMagazines.reduce((n,m)=>n+m.rounds,0),7);
});
test('between-mission resupply and equipment swap are deliberate',()=>{
 const roster=equipRoster(initialRoster(),'rook','rifle');
 assert.equal(roster.members[0].weapon,'rifle');
 const spent={...roster,members:roster.members.map((m,i)=>i===0?
   {...m,magazine:0,reserve:0}:m)};
 const supply=resupplyRoster(spent,'rook');
 assert.equal(supply.members[0].magazine,10);
 assert.equal(supply.members[0].reserve,30);
 assert.equal(spent.members[0].reserve,0);
});
