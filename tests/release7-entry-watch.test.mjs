import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planSquadEntry,planAim,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {entryClearanceForLook} from '../src/breach-entry-coordination.ts';

const pt=(x,y)=>({x,y});
const site={
 seed:7401,name:'R7 FOUR-PERSON WATCH HANDOFF',layout:'corridor',
 training:true,rooms:[],roomCount:0,cover:[],windows:[],
 walls:[{a:pt(90,260),b:pt(290,260)},{a:pt(332,260),b:pt(550,260)}],
 doors:[{id:'ENTRY',a:pt(290,260),b:pt(332,260),
  kind:'hinged',hinge:'a',swing:-1,open:false,openedAt:-1}],
 entrance:pt(311,260),
 spawn:[pt(300,200),pt(308,173),pt(316,146),pt(325,119)],
 enemies:[],objective:pt(520,450),extract:pt(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('R7.4 explicit WATCH survives a coordinated multi-follower threshold entry',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const actors=team(s).slice(0,4);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const goals=actors.map(a=>a.plan.find(n=>n.entryDoorId==='ENTRY'));
  const watched=new Map();
  for(const [i,a] of actors.entries()){
   if(i===0)continue; // Lead's deliberate door interaction owns attention.
   const stack=a.plan.find(n=>n.stackDoorId==='ENTRY');
   assert.ok(stack&&goals[i]);
   const point=pt(410+i*14,167-i*7);
   assert.equal(planAim(s,a.id,'track',point,stack.id,'watch'),true);
   watched.set(a.id,point);
  }
  const crossed=new Set(),arrived=new Set();
  toggling(s);
  for(let tick=0;tick<1500;tick++){
   stepSession(s,1/30);
   for(const [i,a] of actors.entries()){
    const goal=goals[i];
    if(!goal)continue;
    if(i>0&&a.plan[0]?.id===goal.id&&
       entryClearanceForLook(s.doors[0],a.p,goal.p)){
      crossed.add(a.id);
      assert.equal(a.aimInstruction?.mode,'track',
       'generated sector must not overwrite an authored WATCH');
      assert.deepEqual(a.aimInstruction?.point,watched.get(a.id));
    }
    if(!a.plan.length&&dist(a.p,goal.p)<18)arrived.add(a.id);
   }
   if(arrived.size===4)break;
  }
  assert.equal(arrived.size,4,'all four authored entries must complete');
  assert.equal(crossed.size,3,'all three watched followers must cross');
  for(const a of actors.slice(1)){
   assert.equal(a.aimInstruction?.mode,'track',
    'explicit WATCH must remain active after the generated MOVE completes');
   assert.deepEqual(a.aimInstruction?.point,watched.get(a.id));
  }
 }finally{activateSite(null);}
});
