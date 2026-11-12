import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moraleResponse,countRecentlySeenThreats} from '../src/breach-ai-morale.ts';
test('R6.3 only personally seen recent opponents count for local outnumbering',()=>{
 const contacts={seenA:{lastSeenAt:6.5},seenB:{lastSeenAt:7.8},
  old:{lastSeenAt:2},reported:{lastSeenAt:null}};
 assert.equal(countRecentlySeenThreats(contacts,8),2);
 assert.equal(countRecentlySeenThreats(contacts,12),0);
 assert.equal(countRecentlySeenThreats({},8),0);
});
test('R6.3 observed isolation and physically stalled retreat influence resolve',()=>{
 const calm=moraleResponse(.58,.40,0,'guard',{nearbyAllies:0});
 const pressured=moraleResponse(.58,.40,0,'guard',{
   nearbyAllies:0,recentlySeenThreats:3,retreatBlocked:true});
 assert.equal(calm,'hold','without extra confirmed pressure response is unchanged');
 assert.equal(pressured,'withdraw','experienced threat and trapped retreat matter');
 assert.equal(moraleResponse(.58,.40,0,'guard',{
   nearbyAllies:3,recentlySeenThreats:3}),calm,
   'real allies can offset pressure when they are close');
 assert.equal(moraleResponse(.1,.8,1,'cautious'),'surrender',
  'existing severe-risk surrender contract is retained');
});
test('R6.3 actor phase supplies only observed contact memory and actual blocked state',()=>{
 const source=readFileSync(new URL('../src/breach-simulation-actor-phase.ts',import.meta.url),'utf8');
 assert.match(source,/countRecentlySeenThreats\(a\.awareness\.contacts,s\.seconds\)/);
 assert.match(source,/retreatBlocked:a\.alert==='retreat'&&a\.blockedTime>=2\.5/);
 assert.doesNotMatch(source,/filter\(.*side==='blue'.*\)\.length/);
});
