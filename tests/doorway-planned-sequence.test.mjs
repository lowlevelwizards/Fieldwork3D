import test from 'node:test';
import assert from 'node:assert/strict';
import {planDoorSchedule,pendingPassageSlot}
 from '../src/breach-passage-plan.ts';
import {passageScheduledStep,passageWait}
 from '../src/breach-passage.ts';
import {newSession,team,planMove,planWaitAt,planWait,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const pt=(x,y)=>({x,y});
const door={id:'MAIN',a:pt(290,260),b:pt(332,260),
  open:true,openedAt:0,kind:'hinged',hinge:'a',swing:-1};
const site={seed:19,name:'GO-TIME PRIORITY',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[{a:pt(90,260),b:pt(290,260)},
  {a:pt(332,260),b:pt(550,260)}],
 doors:[door],cover:[],entrance:pt(311,260),
 spawn:[pt(300,210),pt(308,174),pt(316,146),pt(325,122)],
 enemies:[],windows:[],objective:pt(520,450),extract:pt(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};
const move=(id,p)=>({id,kind:'move',p});
const wait=(id,duration)=>({id,kind:'wait',p:pt(300,0),duration});
const actors=[
 {id:'closest',side:'blue',health:4,p:pt(300,210),
   pace:'walk',plan:[wait(1,2),move(2,pt(300,350))]},
 {id:'fast',side:'blue',health:4,p:pt(308,170),
   pace:'walk',plan:[move(3,pt(308,350))]},
 {id:'detour',side:'blue',health:4,p:pt(316,170),
   pace:'walk',plan:[move(4,pt(360,190)),move(5,pt(320,350))]},
 {id:'rear',side:'blue',health:4,p:pt(325,125),
   pace:'walk',plan:[move(6,pt(326,350))]}
];
test('GO schedule sorts predicted THROUGH-door arrival, not physical nearest',()=>{
 const plan=planDoorSchedule(actors,[door],(_,to)=>[to]);
 const byId=Object.fromEntries(actors.map(a=>
  [a.id,plan.get(a.id)?.[0]]));
 assert.equal(byId.fast?.rank,0);
 assert.ok(byId.closest.rank>byId.fast.rank,
  'closest unit with WAIT must not steal front of planned queue');
 assert.ok(byId.detour.eta>byId.fast.eta,
  'an indirect route must count more than just current door distance');
 assert.ok(byId.rear.rank>byId.fast.rank);
 assert.ok(byId.closest.eta>2,'wait delay must contribute to ETA');
 assert.equal(pendingPassageSlot(pt(308,278),[byId.fast],[door])?.actorId,
  'fast','still within the doorway until whole body clears');
 assert.equal(pendingPassageSlot(pt(308,280),[byId.fast],[door]),null,
  'finished crossing releases the original queue claim');
});
test('a future crossing after manual WAIT does not acquire an immediate lease',()=>{
 const plan=planDoorSchedule(actors,[door],(_,to)=>[to]);
 const waiting={id:'closest',side:'blue',p:pt(300,215),
  goal:null,active:false,health:4,blockedTime:0,
  plannedPassage:plan.get('closest')[0]};
 const first={id:'fast',side:'blue',p:pt(308,229),
  goal:pt(308,350),active:true,health:4,blockedTime:0,
  plannedPassage:plan.get('fast')[0]};
 const leases={};
 assert.equal(passageWait(first,[door],[first,waiting],leases,0),false);
 assert.equal(leases['blue:MAIN'].actorId,'fast');
});
test('later-ranked actor paces on approach before touching the doorframe',()=>{
 const d={...door,a:pt(40,100),b:pt(88,100)};
 const lead={id:'lead',p:pt(64,45),side:'blue',goal:pt(64,160),
  health:4,active:true,blockedTime:0,
  plannedPassage:{actorId:'lead',doorId:'MAIN',fromSide:-1,rank:0,eta:1}};
 const later={id:'later',p:pt(66,70),side:'blue',goal:pt(66,160),
  health:4,active:true,blockedTime:0,
  plannedPassage:{actorId:'later',doorId:'MAIN',fromSide:-1,rank:1,eta:2}};
 const moveTo=pt(66,73);
 const step=passageScheduledStep(later,[d],[later,lead],moveTo,()=>false);
 assert.deepEqual(step,later.p,
  'pre-sequencing already holds the out-of-turn actor 30 units before door');
 lead.p=pt(64,95);
 const resumed=passageScheduledStep(later,[d],[later,lead],moveTo,()=>true);
 assert.ok(resumed.y>later.p.y,'following operator resumes as leader advances');
});
test('one second is the default authored WAIT, while explicit durations are kept',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const [a,b]=team(s);
  assert.equal(planWait(s,a.id),true);
  assert.equal(a.plan.at(-1).duration,1);
  assert.equal(planWaitAt(s,b.id),true);
  assert.equal(b.plan[0].duration,1);
  assert.equal(planWaitAt(s,b.id,1.7,'end'),true);
  assert.equal(b.plan.at(-1).duration,1.7);
 }finally{activateSite(null);}
});
test('four live operators obey GO-time ETA order and all clear the doorway',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const members=team(s).slice(0,4);
  const goals=members.map((_,i)=>pt(296+i*10,371+i*3));
  // Frontmost initially waits. Farther operators with faster full plans
  // must cross first, without having to converge into a doorway pile.
  assert.equal(planWaitAt(s,members[0].id,2.5,'here'),true);
  for(let i=0;i<4;i++)
   assert.equal(planMove(s,members[i].id,goals[i]),true);
  const predicted=planDoorSchedule(members,s.doors,(from,to)=>[to]);
  const ranking=members.map(a=>predicted.get(a.id)?.[0]);
  assert.ok(ranking.every(Boolean),
    'four queued routes should all be recognized before GO');
  assert.ok(ranking[0].rank>ranking[1].rank,
    'WAIT must put the closest actor behind another entry');
  toggling(s);
  const crossed=new Map(),closestApproach=new Map();
  let maxAtThroat=0;
  for(let tick=0;tick<1200;tick++){
   stepSession(s,1/30);
   const near=members.filter(a=>Math.abs(a.p.y-260)<18);
   maxAtThroat=Math.max(maxAtThroat,near.length);
   for(const a of members){
    closestApproach.set(a.id,Math.min(closestApproach.get(a.id)??Infinity,
      Math.abs(a.p.y-260)));
    if(!crossed.has(a.id)&&a.p.y>279)crossed.set(a.id,s.seconds);
   }
   if(crossed.size===4&&members.every(a=>a.plan.length===0))break;
  }
  assert.equal(crossed.size,4,
   'all four must cross, not form a doorway deadlock: '+
   JSON.stringify(members.map(a=>({id:a.id,p:a.p,
    orders:a.plan.map(n=>n.kind),pause:a.motorPause}))));
  assert.ok(crossed.get(members[1].id)<crossed.get(members[0].id),
   'earlier planned arrival must enter before delayed closest: '+
   JSON.stringify([...crossed]));
  const order=[...members].sort((a,b)=>
    ranking[members.indexOf(a)].rank-ranking[members.indexOf(b)].rank);
  assert.deepEqual([...crossed.keys()],order.map(a=>a.id),
   'live crossing order should match the full-plan ETA sequence');
  assert.ok(maxAtThroat<=2,
   'never cram three or four operators into the physical doorway');
  assert.ok(members.every(a=>a.plan.length===0),
   'ordered entry must still complete the original plans');
 }finally{activateSite(null);}
});
