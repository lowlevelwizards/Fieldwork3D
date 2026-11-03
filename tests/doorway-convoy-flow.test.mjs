import test from 'node:test';
import assert from 'node:assert/strict';
import {crossingDoor,passageWait,PASSAGE_FOLLOW_GAP,PASSAGE_STACK_DEPTH}
 from '../src/breach-passage.ts';
import {newSession,team,planMove,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const door={id:'CONVOY',a:{x:40,y:100},b:{x:88,y:100},open:true};
const unit=(id,y,goalY=180)=>({
 id,side:'blue',p:{x:64,y},goal:{x:64,y:goalY},
 health:4,blockedTime:0,active:true
});
test('a distant follower walks into the stack instead of freezing across the room',()=>{
 const lead=unit('lead',91),follower=unit('follower',51),leases={};
 assert.equal(passageWait(lead,[door],[lead,follower],leases,0),false);
 assert.equal(passageWait(follower,[door],[lead,follower],leases,0),false);
 follower.p.y=74;
 assert.equal(passageWait(follower,[door],[lead,follower],leases,.1),true,
  'the stack should actually hold a body gap when it gets too close');
 assert.ok(PASSAGE_FOLLOW_GAP>=18&&PASSAGE_STACK_DEPTH<=25);
});
test('a follower goes through while the leader is still in the threshold',()=>{
 const lead=unit('lead',91),follower=unit('follower',60),leases={};
 assert.equal(passageWait(lead,[door],[lead,follower],leases,0),false);
 lead.p.y=113;
 follower.p.y=90;
 assert.equal(crossingDoor(lead,door),true);
 assert.equal(passageWait(follower,[door],[lead,follower],leases,.15),false,
  'the trailing operator must not wait until the lead reaches its destination');
});
test('four same-direction teammates keep a compact moving queue',()=>{
 const units=[unit('one',90),unit('two',66),unit('three',43),unit('four',21)];
 const leases={};
 assert.deepEqual(units.filter(a=>
  !passageWait(a,[door],units,leases,0)).map(a=>a.id),['one','two','three','four']);
 units[0].p.y=92;
 units[1].p.y=75;
 assert.equal(passageWait(units[1],[door],units,leases,.1),true);
 units[0].p.y=112;
 assert.equal(passageWait(units[1],[door],units,leases,.2),false);
});
test('counterflow stages at the mouth, not far back, and respects the owner',()=>{
 const lead=unit('lead',94,170),counter=unit('counter',135,40),leases={};
 assert.equal(passageWait(lead,[door],[lead,counter],leases,0),false);
 assert.equal(passageWait(counter,[door],[lead,counter],leases,0),false,
  'approaching from 35 units away should not freeze');
 counter.p.y=118;
 assert.equal(passageWait(counter,[door],[lead,counter],leases,.1),true,
  'counterflow should stop just ahead of the threshold');
});
test('opposite-side actors never claim the friendly squad reservation',()=>{
 const blue=unit('blue',92),red={...unit('red',104,40),side:'red'};
 const leases={};
 passageWait(blue,[door],[blue,red],leases,0);
 passageWait(red,[door],[blue,red],leases,0);
 assert.equal(leases['blue:CONVOY'].actorId,'blue');
 assert.equal(leases['red:CONVOY'].actorId,'red');
});

const hinged={id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
 open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'};
const site={
 seed:31,name:'CONVOY FLOW TIMING',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[
  {a:{x:90,y:260},b:{x:290,y:260}},
  {a:{x:332,y:260},b:{x:550,y:260}}
 ],
 doors:[hinged],cover:[],entrance:{x:310,y:260},
 spawn:[{x:300,y:200},{x:308,y:173},{x:316,y:146},{x:325,y:119}],
 enemies:[],windows:[],objective:{x:520,y:450},extract:{x:520,y:460},
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};
test('actual four-operator game flow crosses in succession, not at plan completion',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const squad=team(s).slice(0,4);
 const goals=squad.map((_,i)=>({x:296+i*10,y:371+i*3}));
 const crossed=new Array(squad.length).fill(null);
 const arrived=new Array(squad.length).fill(null);
 try{
  for(let i=0;i<squad.length;i++)
   assert.equal(planMove(s,squad[i].id,goals[i]),true,
    'cannot plan operator '+squad[i].id);
  toggling(s);
  for(let i=0;i<1080;i++){
   stepSession(s,1/30);
   for(let j=0;j<squad.length;j++){
    if(crossed[j]===null&&squad[j].p.y>278)crossed[j]=s.seconds;
    if(arrived[j]===null&&Math.hypot(squad[j].p.x-goals[j].x,
      squad[j].p.y-goals[j].y)<16)arrived[j]=s.seconds;
   }
   if(arrived.every(v=>v!==null))break;
  }
  assert.ok(crossed.every(t=>t!==null),
   'all operators must cross: '+JSON.stringify({crossed,arrived}));
  const sorted=crossed.filter(t=>t!==null).sort((a,b)=>a-b);
  for(let i=1;i<sorted.length;i++)
   assert.ok(sorted[i]-sorted[i-1]<1.65,
    'doorway throughput too slow: '+JSON.stringify({crossed,arrived}));
  assert.ok(sorted[1]<Math.min(...arrived.filter(t=>t!==null)),
   'the second soldier should enter before the first finishes their plan');
 }finally{activateSite(null);}
});
