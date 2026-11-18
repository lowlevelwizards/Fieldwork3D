/** D3.28A: read-only one-seed final entry-loop witness.
 * Replays real 60Hz motor positions and existing source-tagged transient
 * routes without touching simulation/door/queue authority.
 */
import {readFileSync} from 'node:fs';
const source=process.argv[2];
if(!source)throw Error('Expected exact Motel R7 report path');
const r=JSON.parse(readFileSync(source,'utf8'));
const row=r.rows?.[0],mode=row?.modes?.find(x=>x.mode==='entry');
if(r.ticks!==2700||row?.seed!==19143269||
   row?.archetype!=='motel'||row?.scale!=='small'||!mode)
 throw Error('D3.28 must preserve frozen Motel 19143269 45s entry');
if(r.summary?.exceptions||r.summary?.invalidPositions||
   r.summary?.physicsStepViolations||r.summary?.corruptedPlans)
 throw Error('Physical integrity regression before loop analysis');
const ash=mode.operators?.find(x=>x.id==='ash');
if(!ash?.arrived||ash.failedOrders||ash.remainingOrders)
 throw Error('Frozen Motel Ash no longer arrives at authored generated GO');
const windows=(mode.progressEvidence??[]).filter(x=>x.actor==='ash');
const suspicious=windows.filter(x=>x.suspicious);
const transitions=(mode.routeTransitions?.events??[])
 .filter(x=>x.actorId==='ash');
const routes=transitions.filter(x=>x.source!=='door-handoff-reject')
 .map(x=>({t:x.seconds,source:x.source,
   from:x.position,next:x.next?.[0]??null,
   blocked:x.blockedTime,door:x.doorId,
   phase:x.doorPhase,maneuver:x.doorManeuver}));
const quality=mode.routeQuality?.actors?.find(x=>x.id==='ash');
// D3.28 release gate: require the SPECIFIC measured loop to disappear,
 // not merely preserve the correct arrival or aggregate squad count.
 // Thresholds have headroom versus the accepted 589.64/46 fresh result
 // and reject the old 958.94/162 looping baseline.
const fine=routes.find(x=>x.source==='d328-entry-fine-world');
const door=routes.find(x=>x.door==='FRONT'&&x.t>6&&
  x.source==='initial-intel');
if(!fine||!door||door.t>15||
   !quality||!Number.isFinite(quality.travel)||
   quality.travel>700||quality.directionReversals>80||
   suspicious.length||windows.some(x=>x.classification==='movement-loop')||
   ash.remaining>6||Math.hypot(ash.position.x-ash.goal.x,
      ash.position.y-ash.goal.y)>6)
 throw Error('D3.28 exact Ash 45s movement-loop recovery regressed');
console.log('D328_FROZEN_MOTEL',JSON.stringify({
 seed:row.seed,scenario:mode.mode,door:mode.doorId,
 arrived:ash.arrived,position:ash.position,goal:ash.goal,
 remaining:ash.remaining,travel:ash.progressDistance,
 suspiciousWindows:suspicious.length,
 windows:windows.map(x=>({t:x.seconds,kind:x.classification,
   suspicious:x.suspicious,travel:x.travel,net:x.net,
   goalReduction:x.goalReduction,remaining:x.remaining,
   nav:x.nextNav,door:x.doorEpisode,retries:x.retries,
   blocked:x.blockedSeconds})),
 sourceRouteCount:routes.length,sourceRoutes:routes.slice(0,100),
 quality:quality?{travel:quality.travel,net:quality.net,
   directionReversals:quality.directionReversals,
   routeSelections:quality.routeSelections,
   selections:quality.selections?.slice(0,55)}:null
}));
