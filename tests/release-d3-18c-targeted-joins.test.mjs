import test from 'node:test';
import assert from 'node:assert/strict';
import {selectMotorVerifiedFurnitureDeparture}
 from '../src/breach-d317c-micro-departure.ts';
import {selectPhysicalOpenLeafRejoin}
 from '../src/breach-physical-leaf-rejoin.ts';
const p=(x,y)=>({x,y});
test('D3.18C: furniture departure rejoins later transient node, keeps GO',()=>{
 const from=p(0,0),goal=p(80,0);
 const original=[p(15,0),p(32,12),p(55,12),goal];
 // The first leg hits furniture. A safe short sideways stage and
 // downstream join are possible even though full GO is not pre-cleared.
 const sweep=(a,b)=>!(b.x>14.5&&b.x<15.5&&Math.abs(b.y)<.5);
 const result=selectMotorVerifiedFurnitureDeparture(from,goal,original,
  sweep,()=>[]);
 assert.ok(result.length);
 assert.deepEqual(result.at(-1),goal);
 assert.ok(!result.some(n=>n.x===15&&n.y===0));
});
test('D3.18C: a blocked full-body microstride cannot gain a join',()=>{
 const original=[p(15,0),p(32,12),p(55,12),p(80,0)];
 assert.deepEqual(selectMotorVerifiedFurnitureDeparture(
  p(0,0),p(80,0),original,()=>false,()=>[]),[]);
});
test('D3.18C: Clinic first nav may rejoin by stage, never reissue blocked direct leg',()=>{
 const leaf={id:'D9',a:p(0,-20),b:p(0,20),kind:'hinged',
  open:true,openFraction:1,angularVelocity:0,wedged:false};
 const from=p(-16,0),goal=p(80,0),first=p(20,0);
 const sweep=(a,b)=>!(a.x===from.x&&b.x>0&&b.y===0);
 const route=selectPhysicalOpenLeafRejoin(from,goal,
  [first,p(45,0),goal],leaf,sweep,()=>true,()=>[]);
 assert.ok(route.length);
 assert.deepEqual(route.at(-1),goal);
});
