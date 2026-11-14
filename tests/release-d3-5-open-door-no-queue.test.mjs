import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinatePassage} from '../src/breach-passage-coordinator.ts';
const p=(x,y)=>({x,y});
const door={id:'OPEN',a:p(80,100),b:p(120,100),
 kind:'hinged',open:true,openFraction:1,angularVelocity:0};
const actor=(id,y,target)=>({id,side:'blue',health:4,p:p(100,y),
 blockedTime:0,passageWaitSeconds:0,motorPause:null,
 plan:[{id:1,kind:'move',p:p(100,target)}]});
const slot=(a,fromSide,rank)=>({
 actorId:a.id,doorId:'OPEN',fromSide,rank,eta:rank+1});
const session=(actors,d={...door})=>({
 operators:actors,doors:[d],seconds:0,events:[]});
test('Q7 open, unoccupied doorway: later-ranked ready mover crosses without waiting',()=>{
 const lead=actor('lead',155,40);
 const follow=actor('follow',132,40);
 const s=session([lead,follow]);
 const schedule=new Map([[lead.id,[slot(lead,1,0)]],
   [follow.id,[slot(follow,1,1)]]]);
 // Lead is still READY but is actually farther from the threshold.
 // Its authored rank is not a reason to block the physically free follower.
 const proposal=p(100,130);
 const actual=coordinatePassage(s,follow,proposal,schedule);
 assert.equal(actual.hold,false);
 assert.deepEqual(actual.move,proposal);
 assert.equal(actual.rank,1);
 assert.deepEqual(follow.plan[0].p,p(100,40));
});
test('Q7 fully open crossing: previous counterflow claim cannot reserve empty opening',()=>{
 const lead=actor('lead',135,40);
 const counter=actor('counter',65,170);
 const s=session([lead,counter]);
 const schedule=new Map([[lead.id,[slot(lead,1,0)]],
   [counter.id,[slot(counter,-1,0)]]]);
 assert.equal(coordinatePassage(s,lead,p(100,134),schedule).hold,false);
 // Move former claimant far away while it retains the authored MOVE,
 // leaving an old 1.8s lease in the immutable queue context.
 lead.p=p(100,220);
 s.seconds=.05;
 const free=coordinatePassage(s,counter,p(100,68),schedule);
 assert.equal(free.hold,false);
 assert.deepEqual(free.move,p(100,68));
});
test('Q7 open doorway still holds when real body occupies the next stride',()=>{
 const lead=actor('lead',125,40),follow=actor('follow',145,40);
 const s=session([lead,follow]);
 const schedule=new Map([[lead.id,[slot(lead,1,0)]],
   [follow.id,[slot(follow,1,1)]]]);
 const held=coordinatePassage(s,follow,p(100,144),schedule);
 assert.equal(held.hold,true);
 assert.deepEqual(held.move,follow.p);
});
test('Q7 still defers partially open and moving leaves to regular queue/hinge safety',()=>{
 const lead=actor('lead',155,40);
 const follow=actor('follow',132,40);
 const schedule=new Map([[lead.id,[slot(lead,1,0)]],
   [follow.id,[slot(follow,1,1)]]]);
 // A half-open doorway is NOT equivalent to a fully clear physical opening.
 const d={...door,openFraction:.4,angularVelocity:1.2};
 const s=session([lead,follow],d);
 const decision=coordinatePassage(s,follow,p(100,130),schedule);
 assert.equal(decision.reason,'spacing');
 assert.equal(decision.hold,true);
});
