import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase} from '../src/breach-door-test-cases.ts';
import {activateSite} from '../src/breach-core.ts';
import {doorClear} from '../src/breach-door.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
const cases=[
 ['ajar-outward','center','north'],
 ['ajar-outward','left','north'],
 ['wide-open','right','north'],
 ['near-frame','right','south'],
 ['swing-furniture','center','south']
];
for(const [id,formation,face] of cases){
 const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(id,formation,face),{enableCivilians:false});
 try{
  prepareDoorRangeCase(s,id);
  const squad=team(s).slice(0,4);
  const accepted=planSquadEntry(s,'ENTRY');
  const before=squad.map(a=>({name:a.name,p:a.p,
   plan:a.plan.map(n=>({kind:n.kind,p:n.p,stack:n.stackDoorId,
    entry:n.entryDoorId,door:n.doorId}))}));
  const snapshots=[];
  if(accepted)toggling(s);
  for(let i=0;i<1800&&accepted;i++){
   stepSession(s,1/60);
   if([0,179,599,1199,1799].includes(i)){
    snapshots.push({sec:+s.seconds.toFixed(2),
     door:{open:s.doors[0].open,fraction:s.doors[0].openFraction,
      angularVelocity:s.doors[0].angularVelocity,
      clear:doorClear(s.doors[0],sessionWorldGeometry(s))},
     squad:squad.map(a=>({name:a.name,p:a.p,
      plan:a.plan.map(n=>({kind:n.kind,p:n.p,door:n.doorId,
        stack:n.stackDoorId,entry:n.entryDoorId})).slice(0,3),
      nav:a.nav.slice(0,3),block:a.lastBlocker,
      pause:a.motorPause,wait:a.waitRemaining,
      episode:a.doorTraversal?.phase,
      orderIssue:a.orderIssue?.reason}))
    });
   }
   if(squad.every(a=>!a.plan.length))break;
  }
  console.log('Q5_EDGE '+JSON.stringify({id,formation,face,accepted,
   before,snapshots,events:s.events.slice(-10)}));
 }finally{activateSite(null);}
}
