/** Q5 reproducible single-case stall trace, real motor fixed steps. */
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
import {activateSite,OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
const s=newSession(0,undefined,'full-view','small','hold',
 doorRangeSite('ajar-outward','right'),{enableCivilians:false});
try{
 prepareDoorRangeCase(s,'ajar-outward');
 const planned=planSquadEntry(s,'ENTRY'),operators=team(s).slice(0,4);
 console.log('Q5_AJAR_PLANNED '+JSON.stringify({planned,orders:operators.map(a=>({
   id:a.id,plan:a.plan.map(n=>({kind:n.kind,p:n.p,stack:n.stackDoorId}))
 }))}));
 if(planned)toggling(s);
 for(let i=0;i<1800;i++){
  stepSession(s,1/60);
  if(![59,179,359,599,1199,1799].includes(i))continue;
  const door=s.doors[0],leaf=doorLeafSegment(door),world=sessionWorldGeometry(s);
  console.log('Q5_AJAR_TRACE '+JSON.stringify({
   second:s.seconds,door:{open:door.open,
    f:door.openFraction,v:door.angularVelocity,leaf},
   operators:operators.map(a=>{
    const node=a.plan[0],goal=node?.p;
    return {id:a.id,p:a.p,orders:a.plan.length,
     first:node?{kind:node.kind,p:node.p,stack:node.stackDoorId}:null,
     nav:a.nav.slice(0,8),path:a.path?.slice(0,8),
     blocker:a.lastBlocker,blocked:a.blockedTime,
     pause:a.motorPause,hand:a.doorHandContact?.mode,
     episode:a.doorTraversal?.phase,autostep:a.autoSidestep,
     leafGap:+pointToSegment(a.p,leaf).toFixed(2),
     direct:goal?sweptBodyClear(a.p,goal,s.doors,
      OPERATOR_RADIUS,world):null};
   }),events:s.events.slice(-10)
  }));
 }
}finally{activateSite(null);}
