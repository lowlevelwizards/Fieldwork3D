/** D0 baseline corpus: real four-operator Session, no mock actor motor.
 * Run: node --experimental-strip-types scripts/audit-door-traversal-baseline.mjs [case-count] [ticks]
 * Non-completion is DATA (not secretly treated as physically passable).
 */
import {DOOR_RANGE_CASES,doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {doorSwingBlocked,doorClear} from '../src/breach-door.ts';
const count=Math.max(1,Math.min(DOOR_RANGE_CASES.length,
 Number.parseInt(process.argv[2]??String(DOOR_RANGE_CASES.length),10)||4));
const ticks=Math.max(60,Math.min(2400,
 Number.parseInt(process.argv[3]??'900',10)||900));
const results=[];
let hardFailures=0;
for(const c of DOOR_RANGE_CASES.slice(0,count)){
 const s=newSession(0,undefined,'full-view','small','hold',doorRangeSite(c.id),
  {enableCivilians:false});
 try{
  prepareDoorRangeCase(s,c.id);
  const actors=team(s).slice(0,4);
  const accepted=planSquadEntry(s,'ENTRY');
  const initial=actors.map(a=>a.plan.map(n=>n.id));
  const crossed=new Set(),finished=new Set(),maneuverActors=new Set();
  const maneuverStarts=new Set();
  let flips=0,open=s.doors[0].open,invalid=0,maxBlock=0;
  let passageWait=0,selectedManeuverFrames=0,peakRetries=0;
  let attachedHandFrames=0,longestGrip=0;
  const actualGrips=new Set();
  if(accepted)toggling(s);
  for(let t=0;t<ticks&&accepted;t++){
   stepSession(s,1/60);
   if(s.doors[0].open!==open){flips++;open=s.doors[0].open;}
   for(const a of actors){
    if(!Number.isFinite(a.p.x+a.p.y))invalid++;
    if(a.p.y>278)crossed.add(a.id);
    if(!a.plan.length)finished.add(a.id);
    maxBlock=Math.max(maxBlock,a.blockedTime);
    passageWait+=a.motorPause==='passage'?1/60:0;
    const hand=a.doorGrip;
    if(hand?.releasedAt===null){
     attachedHandFrames++;
     actualGrips.add(a.id+':'+hand.startedAt.toFixed(4));
     longestGrip=Math.max(longestGrip,s.seconds-hand.startedAt);
    }
    if(a.doorTraversal){
     const ep=a.doorTraversal;
     peakRetries=Math.max(peakRetries,ep.maneuverAttempts);
     if(ep.maneuver!=='direct'){
      maneuverActors.add(a.id);
      maneuverStarts.add(a.id+':'+ep.authoredOrderId);
      selectedManeuverFrames++;
     }
    }
   }
   if(finished.size===4)break;
  }
  const d=s.doors[0],world=sessionWorldGeometry(s);
  const obstruction=d.open&&doorSwingBlocked(d,
   Math.min(1.55,(d.openFraction??0)+.07),[],undefined,world);
  const intact=actors.every((a,i)=>a.plan.every(n=>initial[i].includes(n.id)));
  if(invalid||!intact)hardFailures++;
  results.push({id:c.id,accepted,crossed:crossed.size,
   finished:finished.size,flips,obstruction,
   openFraction:Math.round((d.openFraction??0)*1000)/1000,
   worldClear:doorClear(d,world),maxBlock:+maxBlock.toFixed(2),
   passageWaitSeconds:+passageWait.toFixed(2),
   maneuverActors:[...maneuverActors],maneuverStarts:maneuverStarts.size,
   maneuverFrames:selectedManeuverFrames,peakManeuverAttempts:peakRetries,
   realGripCount:actualGrips.size,attachedHandFrames,
   longestGripSeconds:+longestGrip.toFixed(3),
   invalid,authoredPlanIntact:intact,
   operators:actors.map(a=>({id:a.id,position:a.p,
     orders:a.plan.length,pause:a.motorPause,
     blocked:a.blockedTime,navCount:a.nav.length,
     phase:a.doorTraversal?.phase??null,
     maneuver:a.doorTraversal?.maneuver??null,
     grip:a.doorGrip?{
      mode:a.doorGrip.mode,attached:a.doorGrip.releasedAt===null,
      point:a.doorGrip.point
     }:null})),
   notices:s.events.filter(e=>/DOOR|ENTRY|BLOCKED/.test(e)).slice(-5)});
 }catch(error){
  hardFailures++;
  results.push({id:c.id,error:error instanceof Error?error.message:String(error)});
 }finally{activateSite(null);}
}
console.log(JSON.stringify({kind:'D0 physical door baseline',
 note:'Completion is diagnostic; authentic blocked hinges must never be marked successful',
 count,ticks,results},null,2));
if(hardFailures)process.exitCode=1;
