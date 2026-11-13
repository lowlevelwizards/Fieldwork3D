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
  ['a',[slot('a',1),slot('a',0,'NEXT',-1)]],
  ['b',[slot('b',0),slot('b',1,'NEXT',-1)]]
 ]);
 assert.equal(movement(s,a,p(100,154),slots).rank,1);
 a.p=p(100,65);
 a.plan=[{id:9,kind:'move',p:p(100,260)}];
 // First A crossing is behind (negative signed depth). Next is pending.
 assert.equal(movement(s,a,p(100,66),slots).rank,0);
});
