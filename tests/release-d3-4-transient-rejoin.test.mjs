import test from 'node:test';
import assert from 'node:assert/strict';
import {repairBlockedTransientWorldLeg}
 from '../src/breach-squeeze-route.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const bounds={minX:0,minY:0,maxX:128,maxY:128};
const corner={bounds,passable:(q,r=8)=>
 q.x>=13&&q.y>=20&&q.x<=115&&q.y<=115&&
 !(q.x>60&&q.x<68&&q.y>32&&q.y<64)};
const barrier={bounds,passable:(q,r=8)=>
 q.x>=13&&q.y>=20&&q.x<=115&&q.y<=115&&
 !(q.x>60&&q.x<68)};
test('D3.4: blocked short transient waypoint gets real swept local connector',()=>{
 const from=p(48,48),next=p(80,48),tail=[p(104,48)];
 assert.equal(sweptBodyClear(from,next,[],8,corner),false);
 const result=repairBlockedTransientWorldLeg(from,next,tail,[],corner);
 assert.ok(result.length>=2);
 assert.deepEqual(result.at(-1),tail[0]);
 assert.deepEqual(result.at(-2),next);
 let prior=from;
 for(const step of result.slice(0,-1)){
  assert.equal(sweptBodyClear(prior,step,[],8,corner),true,
   'every inserted motor segment must preserve full-radius physical clearance');
  prior=step;
 }
 assert.deepEqual(tail,[p(104,48)],'original transient tail is unchanged');
});
test('D3.4: no rejoin through impossible wall or far/clear path',()=>{
 assert.deepEqual(repairBlockedTransientWorldLeg(p(48,48),p(80,48),
  [p(104,48)],[],barrier),[]);
 assert.deepEqual(repairBlockedTransientWorldLeg(p(24,48),p(104,48),
  [],[],corner),[],'not a broad-route controller');
 assert.deepEqual(repairBlockedTransientWorldLeg(p(24,24),p(48,24),
  [],[],corner),[],'already clear paths retain original nav');
});
