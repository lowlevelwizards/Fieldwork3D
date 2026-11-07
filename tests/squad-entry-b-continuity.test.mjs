import test from 'node:test';
import assert from 'node:assert/strict';
import {entryClearanceForLook} from '../src/breach-entry-coordination.ts';
import {angleDifference} from '../src/breach-plan.ts';
import {newSession,team,planSquadEntry,planMove,undoPlan,redoPlan,
 stepSession,toggling} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const door={id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
  open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'};
const site={
 seed:31044,name:'TACTICAL ENTRY LOOK CONTINUITY',layout:'corridor',
 training:true,rooms:[],roomCount:0,cover:[],windows:[],
 walls:[{a:{x:90,y:260},b:{x:290,y:260}},
        {a:{x:332,y:260},b:{x:550,y:260}}],
 doors:[door],entrance:{x:310,y:260},
 spawn:[{x:300,y:200},{x:308,y:173},
        {x:316,y:146},{x:325,y:119}],
 enemies:[],objective:{x:520,y:450},extract:{x:520,y:460},
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const aimed=(a,angle)=>Math.abs(angleDifference(a.heading,angle));

test('B11: physical body clearance gates the entry look in either orientation',()=>{
 const position={x:311,y:260};
 assert.equal(entryClearanceForLook(undefined,{x:311,y:300},{x:311,y:350}),false);
 assert.equal(entryClearanceForLook(door,{x:311,y:250},{x:311,y:350}),false,
  'do not turn to room sector on the approach side');
 assert.equal(entryClearanceForLook(door,position,{x:311,y:350}),false,
  'a torso centered on the threshold has not passed the door');
 assert.equal(entryClearanceForLook(door,{x:311,y:275},{x:311,y:350}),false);
 assert.equal(entryClearanceForLook(door,{x:311,y:276},{x:311,y:350}),true);
 assert.equal(entryClearanceForLook(door,{x:311,y:290},{x:311,y:250}),false);
 assert.equal(entryClearanceForLook({...door,a:door.b,b:door.a},
  {x:311,y:276},{x:311,y:350}),true);
 const rotated={...door,a:{x:260,y:290},b:{x:260,y:332}};
 assert.equal(entryClearanceForLook(rotated,{x:276,y:311},{x:355,y:311}),true);
 assert.equal(entryClearanceForLook(rotated,{x:244,y:311},{x:355,y:311}),false);
 assert.equal(entryClearanceForLook({...door,a:{x:1,y:2},b:{x:1,y:2}},
  {x:311,y:276},{x:311,y:350}),false);
});

test('B12: only generated entries carry the threshold look marker; squad undo is exact',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const members=team(s);
  assert.equal(planMove(s,members[0].id,{x:307,y:210}),true);
  assert.equal(members[0].plan[0].entryDoorId,undefined);
  const before=members.map(a=>JSON.parse(JSON.stringify(a.plan)));
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const after=members.map(a=>JSON.parse(JSON.stringify(a.plan)));
  for(const a of members){
   const generated=a.plan.filter(n=>n.kind==='move'&&n.entryDoorId==='ENTRY');
   assert.equal(generated.length,1);
   assert.equal(generated[0].aimMode,'fixed');
   assert.ok(Number.isFinite(generated[0].facing));
   assert.ok(!a.plan.some(n=>n.kind!=='move'&&n.entryDoorId),
    'the look handoff must not affect the gate or synchronization');
  }
  assert.equal(undoPlan(s,members[2].id),true);
  assert.deepEqual(members.map(a=>JSON.parse(JSON.stringify(a.plan))),before);
  assert.equal(redoPlan(s,members[1].id),true);
  assert.deepEqual(members.map(a=>JSON.parse(JSON.stringify(a.plan))),after);
 }finally{activateSite(null);}
});

test('B13: a real four-person entry begins sector turn during move and holds it after arrival',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const actors=team(s);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const objectives=actors.map(a=>a.plan.find(n=>
   n.kind==='move'&&n.entryDoorId==='ENTRY'));
  const began=Array(actors.length).fill(false);
  const arrived=Array(actors.length).fill(false);
  const firstTurn=Array(actors.length).fill(null);
  const samples=actors.map(()=>[]);
  const closest=Array(actors.length).fill(Infinity);
  const clearanceTicks=Array(actors.length).fill(0);
  toggling(s);
  for(let tick=0;tick<1500;tick++){
   stepSession(s,1/30);
   for(let i=0;i<actors.length;i++){
    const a=actors[i],goal=objectives[i];
    if(!goal)continue;
    const stillMoving=a.plan[0]?.id===goal.id;
    if(stillMoving&&entryClearanceForLook(s.doors[0],a.p,goal.p)){
     const error=aimed(a,goal.facing);
     closest[i]=Math.min(closest[i],error);
     clearanceTicks[i]++;
     if(samples[i].length<12)
      samples[i].push({at:+s.seconds.toFixed(2),y:+a.p.y.toFixed(1),
       remaining:+distance(a.p,goal.p).toFixed(1),
       heading:+a.heading.toFixed(2),facing:+goal.facing.toFixed(2),
       error:+error.toFixed(2),squeeze:a.squeeze,plan:a.plan[0]?.kind});
     if(error<.4){
      began[i]=true;
      if(firstTurn[i]===null)
       firstTurn[i]={at:s.seconds,y:a.p.y,remaining:distance(a.p,goal.p)};
     }
    }
    if(!a.plan.length&&distance(a.p,goal.p)<18)
     arrived[i]=true;
   }
   if(arrived.every(Boolean))break;
  }
  assert.ok(arrived.every(Boolean),
    'all four finish the authored entry: '+JSON.stringify({
     arrived,poses:actors.map(a=>({id:a.id,p:a.p,orders:a.plan.length}))
    }));
  assert.ok(began.every(Boolean),
    'entry sector facing should start while still walking: '+
     JSON.stringify({began,firstTurn,closest,clearanceTicks,samples}));
  for(let i=0;i<actors.length;i++){
   const a=actors[i],goal=objectives[i];
   assert.equal(a.aimInstruction?.mode,'fixed',
    'persistent sector hold must activate on the authored destination');
   assert.ok(Math.abs(angleDifference(a.aimInstruction.angle,goal.facing))<.001);
  }
 }finally{activateSite(null);}
});
