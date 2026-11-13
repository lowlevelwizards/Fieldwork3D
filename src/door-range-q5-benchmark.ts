/** Q5 reproducible REAL-session benchmark. No proxy movement, no hidden
 * spawn-through-door shortcuts, and no altered physics for the test.
 * Runs one case at 60Hz; timing is simulated seconds, not host CPU time.
 */
import {activateSite,type Pt} from './breach-core.ts';
import {doorClear,doorSwingBlocked} from './breach-door.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {newSession,team,planSquadEntry,planMove,
 stepSession,toggling} from './breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase,
 type DoorRangeCaseId,type DoorRangeApproachId}
 from './breach-door-test-cases.ts';

export const Q5_MAX_SECONDS=30;
export const Q5_HINGE_CASES=[
 'inward-left','outward-left','inward-right','outward-right'
] as const satisfies readonly DoorRangeCaseId[];
export type Q5Program='squad'|'independent';
export type Q5BenchmarkResult={
 door:DoorRangeCaseId;approach:DoorRangeApproachId;program:Q5Program;
 outcome:'pass'|'plan-rejected'|'timeout'|'invalid-motion'|
  'expected-blocked'|'expected-obstructed'|'unsafe-crossing';
 planned:boolean;success:boolean;seconds:number;firstCross:number|null;
 lastCross:number|null;crossingSpan:number|null;finishTime:number|null;
 crossed:number;completed:number;minSeparation:number;
 settledMinSeparation:number;closeFrames:number;
 doorState:{fraction:number;clear:boolean;blockedAtFullOpen:boolean};
 operators:{id:string;x:number;y:number;orders:number;
  blocker:string|null;pause:string|null;phase:string|null;
  maneuver:string|null;blockedSeconds:number}[];
 events:string[];
};
const metric=(n:number|null)=>n===null?null:+n.toFixed(3);
const range=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function runDoorRangeQ5(
 door:DoorRangeCaseId,approach:DoorRangeApproachId,
 program:Q5Program='squad',maxSeconds=Q5_MAX_SECONDS
):Q5BenchmarkResult{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite(door,approach),{enableCivilians:false});
 try{
  prepareDoorRangeCase(s,door);
  const actors=team(s).slice(0,4);
  // Distinct adult-size end positions; the old Door Lab's 12×6 spacing
  // could make independent actors finish on top of one another.
  const goals=actors.map((_,i)=>({x:282+i*23,y:346+(i%2)*18}));
  const planned=program==='squad'?planSquadEntry(s,'ENTRY'):
    actors.every((a,i)=>planMove(s,a.id,goals[i]));
  const crossed=new Map<string,number>();
  let minSeparation=Infinity,settledMin=Infinity,closeFrames=0,
   invalidMotion=false,finishedAt:number|null=null;
  if(planned){
   toggling(s);
   const maxTicks=Math.ceil(Math.max(0,maxSeconds)*60);
   for(let tick=0;tick<maxTicks;tick++){
    stepSession(s,1/60);
    for(let i=0;i<actors.length;i++){
     const a=actors[i];
     if(!Number.isFinite(a.p.x+a.p.y)||a.p.x<0||a.p.x>640||
        a.p.y<0||a.p.y>500)invalidMotion=true;
     // Full torso must be past the plane, not just on the threshold.
     if(a.p.y>278&&!crossed.has(a.id))
      crossed.set(a.id,s.seconds);
     for(let j=i+1;j<actors.length;j++){
      const peer=actors[j],gap=range(a.p,peer.p);
      minSeparation=Math.min(minSeparation,gap);
      if(gap<16)closeFrames++;
      if(!a.plan.length&&!peer.plan.length)
       settledMin=Math.min(settledMin,gap);
     }
    }
    if(invalidMotion)break;
    if(actors.every(a=>!a.plan.length)){
     finishedAt=s.seconds;break;
    }
   }
  }
  const world=sessionWorldGeometry(s);
  const leaf=s.doors[0];
  const doorState={fraction:+(leaf.openFraction??0).toFixed(3),
   clear:doorClear(leaf,world),
   blockedAtFullOpen:doorSwingBlocked(leaf,1,[],undefined,world)};
  const times=[...crossed.values()].sort((a,b)=>a-b);
  const complete=actors.filter(a=>!a.plan.length).length;
  const expectedBlocked=door==='locked'||door==='wedged';
  const expectedObstructed=door==='swing-furniture'&&
    doorState.blockedAtFullOpen&&!doorState.clear;
  const unsafeSettling=Number.isFinite(settledMin)&&settledMin<15.5;
  const pass=planned&&!invalidMotion&&!expectedBlocked&&
    !expectedObstructed&&!unsafeSettling&&
    crossed.size===4&&complete===4&&finishedAt!==null;
  // A blocked 0.387-fraction hinge against a real cabinet is a NEGATIVE
  // case: it is correct not to force four torsos through an aperture that
  // doorClear rejects. One individual may find a legal pocket but a forced
  // full-squad clearance would violate the real collision contract.
  const outcome:Q5BenchmarkResult['outcome']=invalidMotion?
   'invalid-motion':unsafeSettling?'unsafe-crossing':
   expectedBlocked?crossed.size?'unsafe-crossing':'expected-blocked':
   expectedObstructed?crossed.size===4?'unsafe-crossing':
     'expected-obstructed':
   !planned?'plan-rejected':pass?'pass':'timeout';
  return {door,approach,program,outcome,planned,success:pass,
   seconds:+s.seconds.toFixed(3),
   firstCross:metric(times[0]??null),lastCross:metric(times[3]??null),
   crossingSpan:metric(times.length===4?times[3]-times[0]:null),
   finishTime:metric(finishedAt),
   crossed:crossed.size,completed:complete,
   minSeparation:Number.isFinite(minSeparation)?
    +minSeparation.toFixed(3):0,
   settledMinSeparation:Number.isFinite(settledMin)?
    +settledMin.toFixed(3):0,
   closeFrames,doorState,
   operators:actors.map(a=>({id:a.id,x:+a.p.x.toFixed(2),
    y:+a.p.y.toFixed(2),orders:a.plan.length,
    blocker:a.lastBlocker??null,pause:a.motorPause??null,
    phase:a.doorTraversal?.phase??null,
    maneuver:a.doorTraversal?.maneuver??null,
    blockedSeconds:+a.blockedTime.toFixed(2)})),
   events:s.events.slice(-12)};
 }finally{activateSite(null);}
}
export function summarizeQ5(rows:readonly Q5BenchmarkResult[]){
 const positive=rows.filter(r=>r.outcome!=='expected-blocked'&&
  r.outcome!=='expected-obstructed');
 const failed=positive.filter(r=>!r.success);
 const passing=positive.filter(r=>r.success);
 const sort=(ns:number[])=>ns.sort((a,b)=>a-b);
 const times=sort(passing.map(r=>r.lastCross!).filter(Number.isFinite));
 const finish=sort(passing.map(r=>r.finishTime!).filter(Number.isFinite));
 const quantile=(a:number[],q:number)=>a.length?
  +a[Math.min(a.length-1,Math.floor((a.length-1)*q))].toFixed(2):null;
 const expectedBlocked=rows.filter(r=>r.outcome==='expected-blocked').length;
 const expectedObstructed=rows.filter(r=>
  r.outcome==='expected-obstructed').length;
 return {cases:rows.length,expectedBlocked,expectedObstructed,
  expectationsMet:passing.length+expectedBlocked+expectedObstructed,
  pass:passing.length,failed:failed.length,
  completionPercent:positive.length?
   +(100*passing.length/positive.length).toFixed(1):0,
  lastCrossMedian:quantile(times,.5),lastCrossP90:quantile(times,.9),
  lastCrossWorst:times.at(-1)??null,
  finishMedian:quantile(finish,.5),finishWorst:finish.at(-1)??null,
  failures:failed.map(r=>({
   door:r.door,approach:r.approach,program:r.program,
   outcome:r.outcome,crossed:r.crossed,completed:r.completed,
   blocked:r.operators.map(a=>[a.id,a.orders,a.blocker,a.phase])}))};
}
