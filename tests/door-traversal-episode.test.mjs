import test from 'node:test';
import assert from 'node:assert/strict';
import {syncDoorTraversalEpisode,signedDoorSide}
 from '../src/breach-door-traversal-episode.ts';
import {operatorCrossingDoor}
 from '../src/breach-door-pressure-arbitration.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
const door={id:'ENTRY',a:p(290,260),b:p(332,260),kind:'hinged',
 hinge:'a',swing:1,open:true,openedAt:0,openFraction:.9};
function actor(goal=p(311,355),position=p(311,222)){
 return {id:'rook',side:'blue',health:4,p:position,
  plan:[{id:101,kind:'move',p:{...goal},entryDoorId:'ENTRY'}],
  nav:[{...goal}],blockedTime:0,lastBlocker:'clear',
  doorTraversal:null,doorTraversalLastProbeAt:-10};
}
test('D1 episode keeps authored destination across temporary navigation',()=>{
 const a=actor(),e=syncDoorTraversalEpisode(a,[door],1);
 assert.ok(e&&e.doorId==='ENTRY');
 assert.equal(e.authoredOrderId,101);
 assert.deepEqual(e.destination,p(311,355));
 a.nav=[p(150,210),p(420,225)];
 assert.equal(syncDoorTraversalEpisode(a,[door],1+1/60),e);
 assert.deepEqual(e.destination,p(311,355));
 assert.equal(operatorCrossingDoor(a,door),true,
  'closing arbitration must use the episode instead of transient nav');
 assert.deepEqual(a.plan[0].p,p(311,355));
 assert.equal(e.waypoints.length,0,'D1 must not author a detour');
});
test('D1 survives an entry pause and releases after full-body clearance',()=>{
 const a=actor(),e=syncDoorTraversalEpisode(a,[door],2);
 assert.ok(e);
 a.p=p(310,256);
 assert.equal(syncDoorTraversalEpisode(a,[door],2.5),e);
 a.p=p(310,287);
 assert.equal(syncDoorTraversalEpisode(a,[door],3)?.phase,'release');
 assert.equal(syncDoorTraversalEpisode(a,[door],3+1/60),null);
 assert.equal(a.doorTraversal,null);
});
test('D1 does not acquire a far or same-side door; cancels on order replacement',()=>{
 const a=actor(p(311,190));
 assert.equal(syncDoorTraversalEpisode(a,[door],1),null);
 a.plan[0].p=p(311,355);a.p=p(311,20);
 assert.equal(syncDoorTraversalEpisode(a,[door],1.3),null);
 a.p=p(311,220);
 assert.ok(syncDoorTraversalEpisode(a,[door],1.6));
 a.plan[0]={id:999,kind:'move',p:p(311,355)};
 assert.equal(syncDoorTraversalEpisode(a,[door],1.62),null);
 assert.equal(a.doorTraversal,null);
 a.plan=[];assert.equal(syncDoorTraversalEpisode(a,[door],1.7),null);
});
test('D1 mirror hinge and swing preserve signed frame geometry',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const d={...door,hinge,swing},a=actor();
  assert.ok(signedDoorSide(a.p,d)<0);
  const e=syncDoorTraversalEpisode(a,[d],0);
  assert.equal(e?.doorId,'ENTRY');
  assert.equal(e.approachSide,-1);
 }
});
test('D1 live Session activates persistent episodes for four-person entry',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('outward-left'),{enableCivilians:false});
 try{
  const members=team(s).slice(0,4);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  toggling(s);
  let seen=0,retained=0;const last=new Map();
  // Match the existing full four-person outward-door acceptance horizon.
  for(let i=0;i<1800;i++){
   stepSession(s,1/30);
   for(const a of members)if(a.doorTraversal){
    seen++;
    const old=last.get(a.id);
    if(old&&old===a.doorTraversal)retained++;
    last.set(a.id,a.doorTraversal);
   }
   if(members.every(a=>!a.plan.length))break;
  }
  assert.ok(seen>4&&retained>0,
   'real operator motor must retain an episode across fixed ticks');
  assert.ok(members.every(a=>!a.plan.length),
   'tracking must not change the existing completed four-operator entry');
 }finally{activateSite(null);}
});
