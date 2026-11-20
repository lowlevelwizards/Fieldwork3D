import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinatePassage,inspectPassageLane}
 from '../src/breach-passage-coordinator.ts';
const p=(x,y)=>({x,y});
const door={id:'FRONT',kind:'hinged',a:p(80,100),b:p(120,100),
 open:true,openFraction:.5,angularVelocity:0};
const actor=(id,y,orderId=1)=>({id,p:p(100,y),side:'blue',health:4,
 surrendered:false,blockedTime:0,passageWaitSeconds:0,
 motorPause:null,plan:[{id:orderId,kind:'move',p:p(100,40)}]});
const slot=(id,rank,orderId=1)=>({actorId:id,rank,orderId,
 doorId:'FRONT',fromSide:1,eta:rank+.5});
const game=(actors)=>({operators:actors,doors:[door],seconds:1,
 events:[],coverState:[],objectRevision:0,site:null});
test('M4.1: casualty or surrender cannot reserve a crossing rank',()=>{
 const lead=actor('lead',122),follow=actor('follow',145);
 lead.surrendered=true;
 const s=game([lead,follow]),schedule=new Map([
  ['lead',[slot('lead',0)]],['follow',[slot('follow',1)]]
 ]);
 const decision=coordinatePassage(s,follow,p(100,144),schedule);
 assert.equal(decision.hold,false);
 assert.deepEqual(decision.move,p(100,144));
 assert.equal(inspectPassageLane(s,'FRONT',1).members[0].ready,false);
});
test('M4.1: cancelled rank ahead of living follower is excluded',()=>{
 const lead=actor('lead',122),follow=actor('follow',145);
 lead.plan=[];
 const s=game([lead,follow]),schedule=new Map([
  ['lead',[slot('lead',0)]],['follow',[slot('follow',1)]]
 ]);
 const decision=coordinatePassage(s,follow,p(100,144),schedule);
 assert.equal(decision.hold,false);
});
test('M4.1: same actor opposite occurrence has distinct live threshold slot',()=>{
 const a=actor('one',125),s=game([a]);
 const schedule=new Map([['one',[
  {...slot('one',0,1),eta:1},
  {...slot('one',1,2),eta:3}
 ]]]);
 assert.equal(coordinatePassage(s,a,p(100,124),schedule).rank,0);
 a.plan=[{id:2,kind:'move',p:p(100,40)}];
 assert.equal(coordinatePassage(s,a,p(100,124),schedule).rank,1);
});
