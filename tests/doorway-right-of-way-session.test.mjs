import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const door={id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
  open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'};
const site={
 seed:19,name:'DOORWAY TRAFFIC TEST',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[
  {a:{x:90,y:260},b:{x:290,y:260}},
  {a:{x:332,y:260},b:{x:550,y:260}}
 ],
 doors:[door],cover:[],entrance:{x:310,y:260},
 spawn:[
  {x:300,y:200},{x:308,y:173},
  {x:316,y:146},{x:325,y:119}
 ],enemies:[],windows:[],
 objective:{x:520,y:450},extract:{x:520,y:460},
 bounds:{minX:0,minY:0,maxX:640,maxY:500},
};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function run(units){
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const squad=team(s).slice(0,units);
 const destinations=squad.map((_,i)=>({x:296+i*10,y:371+i*3}));
 try{
  for(let i=0;i<squad.length;i++)
   assert.ok(planMove(s,squad[i].id,destinations[i]),
     'cannot author destination for '+squad[i].id);
  toggling(s);
  for(let tick=0;tick<1050&&s.phase==='running';tick++){
   stepSession(s,1/30);
   if(squad.every((a,i)=>gap(a.p,destinations[i])<8))break;
  }
  return {positions:squad.map((a,i)=>({
    id:a.id,remaining:gap(a.p,destinations[i]).toFixed(2),
    p:a.p,blockedTime:a.blockedTime,blocker:a.lastBlocker,
    next:a.plan[0]?.kind,nav:a.nav.length
  })),phase:s.phase,leases:s.passageLeases,
  door:s.doors.map(d=>({open:d.open,angle:d.openFraction}))};
 }finally{activateSite(null);}
}
test('real game motor: two overlapping routes cross same hinged doorway',()=>{
 const result=run(2);
 assert.ok(result.positions.every(x=>Number(x.remaining)<8),
   '2-person queue stalled: '+JSON.stringify(result));
});
test('real game motor: four overlapping routes cross same hinged doorway',()=>{
 const result=run(4);
 assert.ok(result.positions.every(x=>Number(x.remaining)<8),
   '4-person queue stalled: '+JSON.stringify(result));
});
