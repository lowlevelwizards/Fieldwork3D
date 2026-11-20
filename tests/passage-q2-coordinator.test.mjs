import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinatePassage,QUEUE_CENTER_GAP,QUEUE_WAIT_DEPTH}
 from '../src/breach-passage-coordinator.ts';
const p=(x,y)=>({x,y});
const door={id:'D',a:p(80,100),b:p(120,100),
 kind:'hinged',open:true,openFraction:1};
const actor=(id,y,target=40)=>({id,side:'blue',health:4,p:p(100,y),
 blockedTime:0,passageWaitSeconds:0,
 motorPause:null,plan:[{id:1,kind:'move',p:p(100,target)}]});
const slot=(id,rank,doorId='D',fromSide=1)=>({
 actorId:id,doorId,fromSide,rank,eta:rank+1
});
function game(actors,doors=[door]){
 return {operators:actors,doors,seconds:0,events:[],coverState:[],
  objectRevision:0,site:null,passageLeases:{}};
}
const movement=(s,a,to,schedule)=>coordinatePassage(s,a,to,schedule);
test('Q2 zero drift during thirty-second ordinary convoy wait',()=>{
 const lead=actor('one',125),follow=actor('two',145);
 const s=game([lead,follow]),schedules=new Map([
  ['one',[slot('one',0)]],['two',[slot('two',1)]]
 ]);
 let held=0;
 for(let i=0;i<1800;i++){
  s.seconds+=1/60;
  const r=movement(s,follow,p(100,144),schedules);
  assert.ok(r.move.y>=follow.p.y-1.01,'never reverse to rebuild preferred gap');
  if(r.hold){held++;assert.deepEqual(r.move,follow.p);}
 }
 assert.ok(held>=1700,'stationary follower retains one stable hold');
 assert.equal(follow.p.y,145);
 assert.equal(QUEUE_CENTER_GAP,20);
 assert.equal(QUEUE_WAIT_DEPTH,19);
});
test('Q2 an authorized leader advances while follower closes only the safe gap',()=>{
 const lead=actor('one',125),follow=actor('two',146);
 const s=game([lead,follow]),slots=new Map([
  ['one',[slot('one',0)]],['two',[slot('two',1)]]
 ]);
 const first=movement(s,lead,p(100,124),slots);
 assert.equal(first.hold,false);
 const follower=movement(s,follow,p(100,142),slots);
 assert.equal(follower.hold,false);
 assert.equal(follower.move.y,145);
 lead.p=p(100,80);
 const released=movement(s,follow,p(100,140),slots);
 assert.equal(released.hold,false);
 assert.equal(released.move.y,140);
});
test('Q2 an authored WAIT does not reserve the threshold against a ready teammate',()=>{
 const a=actor('handler',125),b=actor('entry',145);
 a.plan=[{id:1,kind:'wait',duration:6,p:p(100,125)}];
 const s=game([a,b]),slots=new Map([
  ['handler',[slot('handler',0)]],['entry',[slot('entry',1)]]
 ]);
 const r=movement(s,b,p(100,144),slots);
 assert.equal(r.hold,false);
 assert.equal(r.move.y,144);
});
test('Q2 different thresholds own different numbered crossings',()=>{
 const a=actor('a',155),b=actor('b',155);
 const next={...door,id:'NEXT',a:p(80,200),b:p(120,200)};
 const s=game([a,b],[door,next]);
 const slots=new Map([
  // A second authored MOVE owns NEXT: a future occurrence cannot claim
  // the current doorway until the first MOVE actually completes.
  ['a',[{...slot('a',1),orderId:1,eta:1},
   {...slot('a',0,'NEXT',-1),orderId:9,eta:3}]],
  ['b',[slot('b',0),slot('b',1,'NEXT',-1)]]
 ]);
 assert.equal(movement(s,a,p(100,154),slots).rank,1);
 a.p=p(100,65);
 a.plan=[{id:9,kind:'move',p:p(100,260)}];
 // First A crossing is behind (negative signed depth). Next is pending.
 assert.equal(movement(s,a,p(100,66),slots).rank,0);
});

test('Q2 real occupant cannot bypass the waiting preceding rank',()=>{
 const rook=actor('rook',308),moss=actor('moss',266);
 const ash=actor('ash',241),vale=actor('vale',222);
 const s=game([rook,moss,ash,vale]);
 const slots=new Map([
  ['rook',[slot('rook',0)]],['moss',[slot('moss',1)]],
  ['ash',[slot('ash',2)]],['vale',[slot('vale',3)]]
 ]);
 const waiting=movement(s,vale,p(100,223),slots);
 assert.equal(waiting.hold,true,
  'an already-crossing occupant must not bypass rank 2 when rank 3 approaches');
 assert.deepEqual(waiting.move,vale.p,'a queue HOLD is not a retreat');
});

test('M2.7: same-door reverse entry drops stale opposing owner when order changes',()=>{
 const oldOwner=actor('lead',90,150),entrance=actor('follower',126,40);
 const s=game([oldOwner,entrance],[{...door,openFraction:.45}]);
 const schedule=new Map([
  ['lead',[{...slot('lead',0,'D',-1),orderId:1,eta:.1},
    {...slot('lead',0,'D',1),orderId:2,eta:2}]],
  ['follower',[{...slot('follower',1,'D',1),orderId:1,eta:1}]]
 ]);
 const before=movement(s,entrance,p(100,100),schedule);
 assert.equal(before.reason,'opposing','original opposite-side crossing really held its lease');
 oldOwner.p=p(100,125);
 oldOwner.plan=[{id:2,kind:'move',p:p(100,40)}];
 s.seconds+=.1;
 const after=movement(s,oldOwner,p(100,124),schedule);
 assert.notEqual(after.reason,'opposing',
  'old opposite direction cannot retain lease across a new authored crossing');
 assert.equal(after.hold,false);
});

test('M2.9: a synchronizing teammate beyond the threshold does not block the approaching squad',()=>{
 const parked=actor('parked',90),approaching=actor('approaching',125);
 parked.plan=[{id:7,kind:'sync',syncCode:'B1',p:p(100,90)}];
 const s=game([parked,approaching],[{...door,openFraction:.45}]);
 const schedule=new Map([
  ['parked',[{...slot('parked',0),orderId:1}]],
  ['approaching',[{...slot('approaching',1),orderId:1}]]
 ]);
 const allowed=movement(s,approaching,p(100,124),schedule);
 assert.equal(allowed.hold,false);
 assert.equal(allowed.reason,'free');
 assert.deepEqual(allowed.move,p(100,124));
});
