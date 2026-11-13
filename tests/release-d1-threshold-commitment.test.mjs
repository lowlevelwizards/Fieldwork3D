import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinatePassage,QUEUE_CENTER_GAP}
 from '../src/breach-passage-coordinator.ts';

const p=(x,y)=>({x,y});
const door={id:'D1',a:p(80,100),b:p(120,100),
 kind:'hinged',open:true,openFraction:1};
const actor=(id,x,y,targetY)=>({
 id,side:'blue',health:4,p:p(x,y),blockedTime:0,
 passageWaitSeconds:0,motorPause:null,
 plan:[{id:1,kind:'move',p:p(x,targetY)}]
});
const slot=(a,fromSide,rank,eta=rank+1)=>({
 actorId:a.id,doorId:'D1',fromSide,rank,eta
});
const session=actors=>({operators:actors,doors:[door],
 seconds:0,events:[]});

test('D1 lease: a moving claimant keeps ownership despite another approacher',()=>{
 const lead=actor('lead',100,140,40);
 const counter=actor('counter',100,85,170);
 const s=session([lead,counter]);
 const schedule=new Map([
  [lead.id,[slot(lead,1,0,1)]],
  [counter.id,[slot(counter,-1,0,2)]]
 ]);
 const first=coordinatePassage(s,lead,p(100,139),schedule);
 assert.equal(first.hold,false);
 assert.equal(first.doorId,'D1');
 s.seconds=.5;lead.p=p(100,137);
 const blocked=coordinatePassage(s,counter,p(100,87),schedule);
 assert.equal(blocked.reason,'opposing');
 assert.equal(blocked.hold,true);
 assert.deepEqual(blocked.move,counter.p,'opposition never teleports backwards');
});

test('D1 lease: backward or sideways drift cannot refresh a stalled approacher',()=>{
 const lead=actor('lead',100,140,40);
 const counter=actor('counter',100,85,170);
 const s=session([lead,counter]);
 const schedule=new Map([
  [lead.id,[slot(lead,1,0,1)]],
  [counter.id,[slot(counter,-1,0,2)]]
 ]);
 coordinatePassage(s,lead,p(100,139),schedule);
 s.seconds=2.2;
 lead.p=p(104,144); // physically farther away, NOT useful crossing progress
 const released=coordinatePassage(s,counter,p(100,87),schedule);
 assert.equal(released.hold,false,
  'opposing READY entrant should take over after the non-throat stall');
 assert.deepEqual(released.move,p(100,87));
 const held=coordinatePassage(s,lead,p(104,110),schedule);
 assert.equal(held.reason,'opposing',
  'stalled claimant must not steal the new owner on its next request');
 assert.ok(held.move.y>=119,'previous claimant must stage outside the other side');
});

test('D1 lease: actual throat occupancy remains authoritative during a stall',()=>{
 const lead=actor('lead',100,108,40);
 const counter=actor('counter',100,85,170);
 const s=session([lead,counter]);
 const schedule=new Map([
  [lead.id,[slot(lead,1,0,1)]],
  [counter.id,[slot(counter,-1,0,2)]]
 ]);
 coordinatePassage(s,lead,p(100,107),schedule);
 s.seconds=3;
 lead.p=p(101,108); // only lateral movement, but still in the throat
 const held=coordinatePassage(s,counter,p(100,87),schedule);
 assert.equal(held.reason,'opposing');
 assert.equal(held.hold,true,'never admit counterflow into an occupied throat');
});

test('D1 interruption: an authored WAIT drops its claim without reordering the plan',()=>{
 const lead=actor('lead',100,140,40);
 const counter=actor('counter',100,85,170);
 const s=session([lead,counter]);
 const schedule=new Map([
  [lead.id,[slot(lead,1,0,1)]],
  [counter.id,[slot(counter,-1,0,2)]]
 ]);
 coordinatePassage(s,lead,p(100,139),schedule);
 lead.plan=[{id:3,kind:'wait',p:p(100,140),duration:2}];
 const moved=coordinatePassage(s,counter,p(100,87),schedule);
 assert.equal(moved.hold,false);
 assert.equal(lead.plan[0].kind,'wait');
});

test('D1 four-person convoy: physical forward steps only, even as leader clears',()=>{
 const members=[125,145,165,185].map((y,i)=>
  actor('unit'+i,100,y,40));
 const s=session(members);
 const schedule=new Map(members.map((a,i)=>[a.id,[slot(a,1,i)]]));
 const before=members.map(a=>a.plan[0]);
 const lead=coordinatePassage(s,members[0],p(100,124),schedule);
 assert.equal(lead.hold,false);
 for(let i=1;i<members.length;i++){
  const unit=members[i];
  const r=coordinatePassage(s,unit,p(100,unit.p.y-10),schedule);
  assert.ok(r.move.y<=unit.p.y,'never backdrift while forming the queue');
  assert.ok(r.move.y>=unit.p.y-10,'never advance more than requested');
  assert.equal(r.rank,i);
 }
 members[0].p=p(100,80); // full capsule beyond threshold
 const follow=coordinatePassage(s,members[1],p(100,135),schedule);
 assert.equal(follow.hold,false);
 assert.equal(follow.rank,1);
 assert.equal(QUEUE_CENTER_GAP,20);
 assert.deepEqual(members.map(a=>a.plan[0]),before,
  'queue only constrains motor proposals; it cannot edit authored plans');
});
