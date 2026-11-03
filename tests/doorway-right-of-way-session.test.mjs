import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planWaitAt,stepSession,toggling}
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
   if(squad.every((a,i)=>!a.plan.length&&
     gap(a.p,destinations[i])<20))break;
  }
  const minFriendlyGap=Math.min(...squad.flatMap((a,i)=>
    squad.slice(i+1).map(b=>gap(a.p,b.p))));
  return {minFriendlyGap,positions:squad.map((a,i)=>({
    id:a.id,remaining:gap(a.p,destinations[i]).toFixed(2),
    p:a.p,blockedTime:a.blockedTime,blocker:a.lastBlocker,
    remainingOrders:a.plan.length,nav:a.nav.length
  })),phase:s.phase,leases:s.passageLeases,
  door:s.doors.map(d=>({open:d.open,angle:d.openFraction}))};
 }finally{activateSite(null);}
}
test('real game motor: two overlapping routes cross same hinged doorway',()=>{
 const result=run(2);
 assert.ok(result.positions.every(x=>
   x.remainingOrders===0&&Number(x.remaining)<20),
   '2-person queue failed to complete routes: '+JSON.stringify(result));
 assert.ok(result.minFriendlyGap>=14,
   '2-person queue ended overlapping: '+JSON.stringify(result));
});
test('real game motor: four overlapping routes cross same hinged doorway',()=>{
 const result=run(4);
 assert.ok(result.positions.every(x=>
   x.remainingOrders===0&&Number(x.remaining)<20),
   '4-person queue failed to complete routes: '+JSON.stringify(result));
 assert.ok(result.minFriendlyGap>=14,
   '4-person queue ended overlapping: '+JSON.stringify(result));
});

test('opener WAIT yields: second enters first and opener follows afterward',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const [opener,second]=team(s);
 const openerInitial={...opener.p};
 const openerGoal={x:297,y:377},secondGoal={x:317,y:382};
 try{
  assert.ok(planWaitAt(s,opener.id,6,'here'));
  assert.ok(planMove(s,opener.id,openerGoal));
  assert.ok(planMove(s,second.id,secondGoal));
  toggling(s);
  let secondCrossedFirst=false;
  for(let i=0;i<1080&&s.phase==='running';i++){
   stepSession(s,1/30);
   if(second.p.y>280&&!secondCrossedFirst){
    secondCrossedFirst=true;
    assert.ok(gap(opener.p,openerInitial)<5,
      'opener moved through while its WAIT should have held position');
   }
  }
  assert.ok(secondCrossedFirst,'second operator never crossed first');
  assert.ok(second.p.y>280&&opener.p.y>280,
    'both operators should eventually enter the room');
  assert.equal(second.plan.length,0);
  assert.equal(opener.plan.length,0);
  assert.ok(gap(opener.p,openerGoal)<20);
  assert.ok(gap(second.p,secondGoal)<20);
 }finally{activateSite(null);}
});
