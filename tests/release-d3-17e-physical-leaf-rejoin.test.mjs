import test from 'node:test';
import assert from 'node:assert/strict';
import {fullBodyMotorRouteClear,joinsExistingMotorRoute}
 from '../src/breach-recovery-route-validation.ts';
import {claimPhysicalLeafRejoin,relevantStableOpenLeaf,
 selectPhysicalOpenLeafRejoin} from '../src/breach-physical-leaf-rejoin.ts';
const p=(x,y)=>({x,y});
const leaf=(angle=1)=>({
 id:'D9',a:p(0,-20),b:p(0,20),open:true,openFraction:angle,
 angularVelocity:0,wedged:false,locked:false,jammed:false,
 kind:'hinged',heldBy:null
});
const actor=()=>({id:'rook',side:'blue',p:p(-16,0),squeeze:false,
 plan:[{kind:'move',id:1,p:p(55,0)}],
 doorTraversal:null,traversal:null,traversalPending:null});
test('E7 shared physical route validator rejects blocked tiny first stride',()=>{
 const sweep=(a,b)=>!(a.x<-14.9&&b.x>=-14.9);
 assert.equal(fullBodyMotorRouteClear(p(-16,0),[p(16,0)],sweep),false);
 assert.equal(fullBodyMotorRouteClear(p(-16,0),[p(16,0)],()=>true),true);
 assert.equal(fullBodyMotorRouteClear(p(-16,0),[p(16,0)],()=>true,10),false);
});
test('E3-5 full-size open leaf stage preserves the original authored goal',()=>{
 const from=p(-16,0),goal=p(55,0),nav=[p(2,0),p(27,0),goal];
 const res=selectPhysicalOpenLeafRejoin(from,goal,nav,leaf(),
   ()=>true,()=>true,()=>[]);
 assert.deepEqual(res,[p(27,0),goal],
  'rejoin directly to later disposable waypoint without editing GO');
});
test('E3-5 unsafe landing cannot be accepted on generic world passability',()=>{
 const from=p(-16,0),goal=p(55,0),nav=[p(2,0),p(27,0),goal];
 const res=selectPhysicalOpenLeafRejoin(from,goal,nav,leaf(),
   ()=>false,()=>true,()=>[]);
 assert.deepEqual(res,[]);
});
test('E3-5 no no-op route, no distant goal skip, and never at closed leaf',()=>{
 const from=p(-16,0),goal=p(55,0);
 assert.deepEqual(selectPhysicalOpenLeafRejoin(from,goal,
   [p(2,0)],leaf(),()=>true,()=>true,()=>[]),[]);
 assert.deepEqual(selectPhysicalOpenLeafRejoin(from,goal,
   [p(2,0),p(27,0),p(53,0)],leaf(0),
   ()=>true,()=>true,()=>[]),[]);
});
test('E3-5 only two cold attempts per unchanged actor/leaf/GO',()=>{
 const a=actor(),d=leaf();
 assert.equal(claimPhysicalLeafRejoin(a,d,p(55,0),1,2,[d]),true);
 assert.equal(claimPhysicalLeafRejoin(a,d,p(55,0),2,2,[d]),false);
 assert.equal(claimPhysicalLeafRejoin(a,d,p(55,0),7,2,[d]),true);
 assert.equal(claimPhysicalLeafRejoin(a,d,p(55,0),13,2,[d]),false);
 assert.equal(claimPhysicalLeafRejoin(a,leaf(.85),p(55,0),
   14,2,[leaf(.85)]),true);
});
test('E3-5 stable real open leaf near the body, no closed-door shortcut',()=>{
 assert.equal(relevantStableOpenLeaf(p(0,0),[leaf()])?.id,'D9');
 assert.equal(relevantStableOpenLeaf(p(0,0),[leaf(.3)]),null);
});
test('E7 rejoin cannot change authored GO or join a malformed route',()=>{
 const s=(a,b)=>true;
 assert.deepEqual(joinsExistingMotorRoute(p(-16,0),p(55,0),
   [p(3,0),p(55,0)],1,[p(55,0)],s,120),[p(55,0)]);
 assert.deepEqual(joinsExistingMotorRoute(p(-16,0),p(55,0),
   [p(3,0),p(54,0)],1,[p(54,0)],s,120),[p(54,0)]);
 assert.deepEqual(joinsExistingMotorRoute(p(-16,0),p(55,0),
   [p(3,0),p(21,0)],1,[p(21,0)],s,120),[]);
});
