import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,team,planNearbyInteraction} from '../src/breach-game.ts';
test('authored physical interactions preserve waypoint intent',()=>{
 const s=newSession();
 const a=team(s)[0];
 const original=a.plan.length;
 const result=planNearbyInteraction(s,a.id,'push');
 if(result){
   assert.equal(a.plan.length,original+1);
   const n=a.plan.at(-1);assert.equal(n.kind,'interact');
   assert.match(n.objectId,/^prop:/);
 }else assert.equal(a.plan.length,original);
});
