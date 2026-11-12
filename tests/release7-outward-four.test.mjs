import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const pt=(x,y)=>({x,y});
const fixture=hinge=>({
 seed:7373,name:'R7 OUTWARD FOUR-PERSON ENTRY',training:true,
 layout:'corridor',roomCount:0,rooms:[],cover:[],windows:[],
 walls:[{a:pt(90,260),b:pt(290,260)},
  {a:pt(332,260),b:pt(550,260)}],
 doors:[{id:'ENTRY',a:pt(290,260),b:pt(332,260),kind:'hinged',
  hinge,swing:1,openedAt:-1,open:false}],
 entrance:pt(311,260),
 spawn:[pt(300,200),pt(308,173),pt(316,146),pt(325,119)],
 enemies:[],objective:pt(520,450),extract:pt(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
});
for(const hinge of ['a','b'])test(
 'R7.2b four-person OUTWARD entry does not close-pong hinge '+hinge,()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',fixture(hinge));
 try{
  const squad=team(s).slice(0,4);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const expected=squad.map(a=>a.plan.find(n=>n.entryDoorId==='ENTRY'));
  assert.ok(expected.every(Boolean));
  const crossing=new Map();
  let reversals=0,wasOpen=s.doors[0].open;
  toggling(s);
  for(let tick=0;tick<1800;tick++){
   stepSession(s,1/30);
   if(s.doors[0].open!==wasOpen){
    reversals++;wasOpen=s.doors[0].open;
   }
   for(const unit of squad){
    if(unit.p.y>280&&!crossing.has(unit.id))
      crossing.set(unit.id,s.seconds);
   }
   if(squad.every(a=>!a.plan.length))break;
  }
  assert.ok(reversals<=1,
   'crossing must not slam leaf closed and reopen repeatedly: '+reversals);
  assert.equal(crossing.size,4,
   'all four must clear outward hinge '+hinge+': '+
     JSON.stringify(squad.map(a=>({id:a.id,p:a.p,
      order:a.plan[0]?.kind,pause:a.motorPause,
      blocked:a.blockedTime,nav:a.nav.slice(0,2)}))));
  assert.ok(squad.every(a=>a.plan.length===0),
   'all four finish original authored entry');
  assert.ok(s.doors[0].open,'outward door remains open until a CLOSE order');
 }finally{activateSite(null);}
});
