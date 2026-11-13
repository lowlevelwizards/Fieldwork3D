/** Q5 reproducible, physical four-person door benchmark. No fake motor.
 * Never classifies a locked / wedged / blocked door as an entry success.
 */
import {newSession,team,planSquadEntry,planMove,toggling,stepSession}
 from './breach-game.ts';
import {activateSite,OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import {doorClear} from './breach-door.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {DOOR_RANGE_CASES,doorRangeSite,prepareDoorRangeCase,
 type DoorRangeCaseId} from './breach-door-test-cases.ts';
import type {DoorRangeFormationId,DoorRangeApproachFace}
 from './breach-door-range-formations.ts';
export type DoorRangeProtocol='squad'|'independent';
export type DoorRangeTrial={
 id:DoorRangeCaseId;formation:DoorRangeFormationId;
 face:DoorRangeApproachFace;protocol:DoorRangeProtocol;
 seed:number;expected:'clear'|'blocked';accepted:boolean;ok:boolean;
 reason:string;crossed:number;finished:number;
 crossingSeconds:(number|null)[];finishSeconds:(number|null)[];
 fourthCrossSeconds:number|null;allOrdersSeconds:number|null;
 totalSeconds:number;minActorGap:number;finalActorGap:number;
 maxBlockSeconds:number;
 flips:number;door:{open:boolean;fraction:number;velocity:number;
  locked:boolean;wedged:boolean};final:{name:string;p:Pt;remaining:number;
  blocker:string|null;pause:string|null;phase:string|null}[];
 events:string[];
};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const Q5_PASSABLE_DOORS=DOOR_RANGE_CASES.filter(c=>
 !['locked','wedged','swing-furniture'].includes(c.id)).map(c=>c.id);
const permanentlyBlocked=(id:DoorRangeCaseId)=>
 ['locked','wedged','swing-furniture'].includes(id);
export function runDoorRangeTrial(id:DoorRangeCaseId,
 formation:DoorRangeFormationId,face:DoorRangeApproachFace,
 protocol:DoorRangeProtocol='squad',ticks=1800):DoorRangeTrial{
 const site=doorRangeSite(id,formation,face);
 const s=newSession(0,undefined,'full-view','small','hold',site,
  {enableCivilians:false});
 const actors=team(s).slice(0,4);
 const crossed:(number|null)[]=actors.map(()=>null);
 const finished:(number|null)[]=actors.map(()=>null);
 const expected=permanentlyBlocked(id)?'blocked':'clear';
 let accepted=false,flips=0,minGap=Infinity,maxBlocked=0;
 let oldOpen=s.doors[0]?.open;
 let finite=true,authored=true,reason='timeout';
 try{
  prepareDoorRangeCase(s,id);
  oldOpen=s.doors[0]?.open;
  if(protocol==='squad')accepted=planSquadEntry(s,'ENTRY');
  else accepted=actors.every((a,i)=>planMove(s,a.id,{
   x:293+i*12,y:face==='north'?346+i*6:174-i*6
  }));
  const authoredIds=actors.map(a=>new Set(a.plan.map(n=>n.id)));
  if(accepted)toggling(s);
  const side=face==='north'?1:-1;
  for(let tick=0;tick<ticks&&accepted;tick++){
   stepSession(s,1/60);
   if(s.doors[0]?.open!==oldOpen){flips++;oldOpen=s.doors[0]?.open;}
   for(let i=0;i<actors.length;i++){
    const a=actors[i];
    if(!Number.isFinite(a.p.x+a.p.y))finite=false;
    if(a.plan.some(n=>!authoredIds[i].has(n.id)))authored=false;
    maxBlocked=Math.max(maxBlocked,a.blockedTime);
    if(crossed[i]===null&&(a.p.y-260)*side>OPERATOR_RADIUS+10)
     crossed[i]=s.seconds;
    if(finished[i]===null&&a.plan.length===0)finished[i]=s.seconds;
    for(let j=i+1;j<actors.length;j++)
     minGap=Math.min(minGap,dist(a.p,actors[j].p));
   }
   if(finished.every(x=>x!==null))break;
   if(expected==='blocked'&&s.seconds>=10&&
      crossed.some(x=>x!==null))break;
  }
  if(!accepted)reason='planning rejected';
  else if(!finite)reason='non-finite actor';
  else if(!authored)reason='authored plan rewritten';
  else if(id==='swing-furniture'&&
      (crossed.every(x=>x!==null)||
       doorClear(s.doors[0],sessionWorldGeometry(s))))
   reason='obstructed panel incorrectly cleared for four operators';
  else if(id==='swing-furniture')
   reason=crossed.some(x=>x!==null)?
    'genuine furniture obstruction · partial physical entry':
    'genuine furniture obstruction · no body entry';
  else if(expected==='blocked'&&crossed.some(x=>x!==null))
   reason='locked or wedged barrier penetrated';
  else if(expected==='blocked')reason='correct locked or wedged obstruction';
  else if(crossed.some(x=>x===null))reason='incomplete physical crossing';
  else if(finished.some(x=>x===null))reason='unfinished authored plan';
  else if(Math.min(...actors.flatMap((a,i)=>actors.slice(i+1)
    .map(b=>dist(a.p,b.p))))<OPERATOR_RADIUS*2-1.8)
   reason='operator destinations overlap';
  else reason='four bodies crossed and orders completed';
  // Friendly bodies intentionally PASS THROUGH each other while moving.
  // Only a final unresolved co-location is an illegal settled destination.
  const finalGap=Math.min(...actors.flatMap((a,i)=>actors.slice(i+1)
    .map(b=>dist(a.p,b.p))));
  const ok=accepted&&finite&&authored&&
    (expected==='blocked'?
      id==='swing-furniture'?
       crossed.some(x=>x===null)&&
       !doorClear(s.doors[0],sessionWorldGeometry(s)):
       !crossed.some(x=>x!==null):
      crossed.every(x=>x!==null)&&finished.every(x=>x!==null)&&
       finalGap>=OPERATOR_RADIUS*2-1.8);
  return {id,formation,face,protocol,seed:site.seed,expected,accepted,ok,
   reason,crossed:crossed.filter(x=>x!==null).length,
   finished:finished.filter(x=>x!==null).length,
   crossingSeconds:crossed,finishSeconds:finished,
   fourthCrossSeconds:crossed.every(x=>x!==null)?Math.max(...crossed as number[]):null,
   allOrdersSeconds:finished.every(x=>x!==null)?Math.max(...finished as number[]):null,
   totalSeconds:s.seconds,minActorGap:minGap,finalActorGap:finalGap,
   maxBlockSeconds:maxBlocked,
   flips,door:{open:!!s.doors[0]?.open,
    fraction:s.doors[0]?.openFraction??0,
    velocity:s.doors[0]?.angularVelocity??0,
    locked:!!s.doors[0]?.locked,wedged:!!s.doors[0]?.wedged},
   final:actors.map(a=>({name:a.name,p:{...a.p},
    remaining:a.plan.length,blocker:a.lastBlocker??null,
    pause:a.motorPause??null,phase:a.doorTraversal?.phase??null})),
   events:s.events.slice(-8)};
 }finally{activateSite(null);}
}
export function summarizeDoorRangeTrials(trials:readonly DoorRangeTrial[]){
 const passed=trials.filter(t=>t.ok),failed=trials.filter(t=>!t.ok);
 const sorted=trials.filter(t=>t.expected==='clear'&&t.fourthCrossSeconds!==null)
  .map(t=>t.fourthCrossSeconds!).sort((a,b)=>a-b);
 const at=(n:number)=>sorted.length?
  sorted[Math.min(sorted.length-1,Math.ceil(n*sorted.length)-1)]:null;
 return {count:trials.length,passed:passed.length,failed:failed.length,
  successRate:trials.length?passed.length/trials.length:0,
  fourthCross:{median:at(.5),p90:at(.9),worst:at(1)},
  failures:failed.map(t=>({id:t.id,formation:t.formation,face:t.face,
   protocol:t.protocol,reason:t.reason,crossed:t.crossed,
   finished:t.finished,seconds:t.totalSeconds,door:t.door,
   minGap:t.minActorGap,finalGap:t.finalActorGap,
   final:t.final,events:t.events}))};
}
