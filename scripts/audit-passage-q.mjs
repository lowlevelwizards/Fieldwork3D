/** Q0/Q1/Q2 diagnostic only: real motor on four known hinge cases. */
import {doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
import {newSession,team,planSquadEntry,stepSession,toggling}
 from '../src/breach-game.ts';
import {doorClear} from '../src/breach-door.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {activateSite} from '../src/breach-core.ts';
const results=[];
for(const id of ['inward-left','outward-left','inward-right','outward-right']){
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite(id),{enableCivilians:false});
 try{
  prepareDoorRangeCase(s,id);
  const actors=team(s).slice(0,4);
  if(!planSquadEntry(s,'ENTRY'))throw Error('cannot plan '+id);
  toggling(s);
  const checkpoints=[];
  for(let i=0;i<1800;i++){
   stepSession(s,1/60);
   if(i===179||i===599||i===1799||actors.every(a=>!a.plan.length)){
    checkpoints.push({second:+s.seconds.toFixed(2),
     fraction:s.doors[0].openFraction,
     clear:doorClear(s.doors[0],sessionWorldGeometry(s)),
     actors:actors.map(a=>({
      id:a.id,p:{x:+a.p.x.toFixed(2),y:+a.p.y.toFixed(2)},
      order:a.plan[0]?.kind??null,orders:a.plan.length,
      blocker:a.lastBlocker,pause:a.motorPause,wait:a.waitRemaining,
      passageWait:a.passageWaitSeconds,blocked:a.blockedTime
     }))});
   }
   if(actors.every(a=>!a.plan.length))break;
  }
  results.push({id,checkpoints,events:s.events.slice(-8)});
 }finally{activateSite(null);}
}
console.log(JSON.stringify({kind:'Q1/Q2 real hinged entry snapshots',results},null,2));
