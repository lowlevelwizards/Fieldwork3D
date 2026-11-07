import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFireLane,fireLaneReachable} from '../src/breach-fire-safety.ts';
import {newSession,team,planSquadEntry,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const from={x:0,y:0},to={x:100,y:0};
const lane=(friend,endpoint=to)=>
 assessFireLane(from,26,endpoint,26,[],[],[],[friend]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('C1: first 12 units of actual muzzle ray are no longer a friendly-fire blind spot',()=>{
 for(const friend of [{x:0,y:0},{x:1,y:0},{x:5,y:2},
                     {x:9.9,y:7},{x:11.9,y:10},{x:12.1,y:2},
                     {x:35,y:0}]){
  assert.equal(lane(friend).blocker,'friendly',
   'near or farther teammate directly in outgoing corridor: '+
   JSON.stringify(friend));
 }
 assert.equal(lane({x:5,y:0}).point.x,5,
  'the veto identifies the actual near teammate');
});

test('C2: backward/sideways friendlies are not fictitious forward blockers',()=>{
 for(const friend of [{x:-9,y:0},{x:-.01,y:0},{x:5,y:11},
                     {x:50,y:15},{x:98,y:0},{x:115,y:0}]){
  assert.equal(lane(friend).blocker,'clear',
   'teammates behind/off the ray or beyond the aimed target are not blocking: '+
   JSON.stringify(friend));
 }
 assert.equal(assessFireLane(from,26,{x:100,y:100},26,[],[],[],
  [{x:7,y:7}]).blocker,'friendly',
 'diagonal outgoing muzzle ray must use the same near-contact safety rule');
});

test('C3: cover-penetrating previews can never override a friendly veto',()=>{
 const blocked=lane({x:6,y:0});
 assert.equal(fireLaneReachable(blocked,{
  end:to,remaining:1
 },to),false);
 assert.equal(fireLaneReachable({blocker:'clear'},null,to),true);
 const wall={a:{x:50,y:-20},b:{x:50,y:20}};
 assert.equal(assessFireLane(from,26,to,26,[],[wall],[],
   [{x:6,y:0}]).blocker,'wall',
  'the established solid-world priority is unchanged');
});

const p=(x,y)=>({x,y});
const fixture={
 seed:31045,name:'CLEARING FIRE SAFETY',layout:'corridor',
 training:true,rooms:[],roomCount:0,cover:[],windows:[],
 walls:[{a:p(90,260),b:p(290,260)},{a:p(332,260),b:p(550,260)}],
 doors:[{id:'ENTRY',a:p(290,260),b:p(332,260),kind:'hinged',
   hinge:'a',swing:-1,open:false,openedAt:-1}],
 entrance:p(311,260),
 spawn:[p(300,200),p(308,173),p(316,146),p(325,119)],
 enemies:[],objective:p(520,450),extract:p(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};

test('C4: real four-person entry finishes; muzzle checks protect every teammate in each sector',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',fixture);
 try{
  const squad=team(s);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const final=squad.map(a=>a.plan.find(n=>n.entryDoorId==='ENTRY'));
  toggling(s);
  for(let tick=0;tick<1500;tick++){
   stepSession(s,1/30);
   if(squad.every(a=>a.plan.length===0))break;
  }
  for(let i=0;i<squad.length;i++){
   const a=squad[i],goal=final[i];
   assert.equal(a.plan.length,0,'no operator may be stopped by fire safety');
   assert.ok(dist(a.p,goal.p)<18);
   assert.equal(a.aimInstruction?.mode,'fixed');
   for(let j=0;j<squad.length;j++){
    if(i===j)continue;
    const teammate=squad[j];
    const separation=dist(a.p,teammate.p);
    assert.ok(separation>=23,
     'the entry planner still assigns physically separate clear sectors');
    const beyond={
     x:teammate.p.x+(teammate.p.x-a.p.x)*.55,
     y:teammate.p.y+(teammate.p.y-a.p.y)*.55
    };
    assert.equal(assessFireLane(a.p,26,beyond,26,[],[],[],
      [teammate.p]).blocker,'friendly',
     a.id+' must not fire through '+teammate.id);
   }
  }
 }finally{activateSite(null);}
});
