/** G4d scripted GO trials through actual motor, AI, and replay.
 * Uses only operator briefing objectives and legal actions for orders.
 * --smoke = five 7s trials; --matrix = 20 12s trials;
 * --full = 40 12s trials. Entirely on demand, not gameplay hot path.
 * CPU timing is host wall time, not mobile FPS or rendered performance.
 */
import {performance} from 'node:perf_hooks';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,planMove,planMoveStroke,stepSession}
 from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessMissionFilm} from '../src/breach-mission-quality.ts';
import {analyzeContactPacing} from '../src/breach-contact-pacing-audit.ts';
import {summarizeG4DFlows} from '../src/breach-g4d-flow-audit.ts';
import {activateSite} from '../src/breach-core.ts';
import {sampleDoorBlock} from '../src/breach-door-navigation-audit.ts';
const options=new Set(process.argv.slice(2));
const mode=options.has('--full')?'full':options.has('--matrix')?'matrix':'smoke';
const trials=mode==='full'?20:mode==='matrix'?10:5;
const intelModes=mode==='smoke'?['floor-plan']:['floor-plan','true-blind'];
const missions=['clear','intel','rescue','hold','capture'];
const seconds=mode==='smoke'?7:12;
const rows=[],exceptions=[];
for(let i=0;i<trials;i++){
 const seed=11+i,mission=missions[i%5];
 let site;
 try{
  site=generateSite(seed,'small',undefined,{mission});
  for(const intelMode of intelModes){
   const session=newSession(0,seed,intelMode,'small',mission,site);
   const actors=team(session).slice(0,2);
   let accepted=0;
   for(const actor of actors){
    // The briefed objective is available only in Floor Plan. True Blind
    // cannot route to undiscovered interior geometry by audit fiat.
    const selected=intelMode==='floor-plan'?
      planMoveStroke(session,actor.id,[site.entrance,site.objective],false,true):
      false;
    const fallback=selected?false:planMove(session,actor.id,site.entrance);
    if(selected||fallback)accepted++;
   }
   const hostileIds=enemies(session).map(a=>a.id);
   const recorder=new MissionRecorder();
   recorder.capture(session,true);
   session.phase='running';session.started=true;
   let blockedFrames=0,silentDoorFrames=0,invalidPositions=0;
   const blockedReasons={},blockedMotorPauses={};
   const doorCaseMap=new Map();
   const elapsed=[];
   for(let tick=0;tick<seconds*30&&session.phase==='running';tick++){
    const before=performance.now();
    stepSession(session,1/30);
    elapsed.push(performance.now()-before);
    recorder.capture(session);
    for(const actor of session.operators){
     if(!Number.isFinite(actor.p.x)||!Number.isFinite(actor.p.y))
      invalidPositions++;
    }
    for(const actor of team(session))
     if(actor.health>0&&actor.blockedTime>.35){
      blockedFrames++;
      const reason=actor.lastBlocker??'unknown';
      blockedReasons[reason]=(blockedReasons[reason]??0)+1;
      const pause=actor.motorPause??'none';
      blockedMotorPauses[pause]=(blockedMotorPauses[pause]??0)+1;
      // A locked or held door is an intentional user-visible stop, but a
      // closed UNRECOGNIZED door silently freezing movement is a regression.
      if(reason==='door'&&pause==='none')silentDoorFrames++;
      if(tick%6===0&&reason==='door'){
       const sample=sampleDoorBlock(actor,session.doors);
       const key=sample.actorId+'|'+(sample.doorId??'unmatched');
       const prior=doorCaseMap.get(key);
       if(!prior)doorCaseMap.set(key,{firstAt:Math.round(session.seconds*100)/100,
         lastAt:Math.round(session.seconds*100)/100,
         samples:1,peak:sample});
       else{
        prior.lastAt=Math.round(session.seconds*100)/100;prior.samples++;
        if(sample.blockedSeconds>=prior.peak.blockedSeconds)prior.peak=sample;
       }
      }
     }
   }
   recorder.capture(session,true);
   const film=assessMissionFilm(recorder.frames,recorder.events,
    session.operators.length);
   const contact=analyzeContactPacing(recorder.frames,recorder.events,
    hostileIds,accepted,site.encounter?.profile==='quiet-approach');
   elapsed.sort((a,b)=>a-b);
   // A short True Blind route to the only briefed entrance is not a
   // motor stall merely because the distance travelled was 15–20 units.
   const briefedEntryOnly=intelMode==='true-blind'&&
    actors.every(a=>{
     const current=session.operators.find(o=>o.id===a.id);
     return !!current&&Math.hypot(current.p.x-site.entrance.x,
       current.p.y-site.entrance.y)<27;
    });
   const reason=briefedEntryOnly&&contact.reason==='movement-stalled'?
     'briefed-entry-only':contact.reason;
   rows.push({seed,mission,mode:intelMode,orders:accepted,
    duration:recorder.duration,
    friendlyTravel:contact.friendlyTravel,
    hostileTravel:contact.hostileTravel,
    firstContactAt:contact.firstContactAt,
    firstShotAt:contact.firstShotAt,
    reason,blockedFrames,silentDoorFrames,
    blockedReasons,blockedMotorPauses,
    doorCases:[...doorCaseMap.values()].sort((a,b)=>b.samples-a.samples).slice(0,8),
    invalidPositions,
    replayIssues:film.issues,
    p95HostSimMs:Math.round((elapsed[Math.min(elapsed.length-1,
      Math.floor(elapsed.length*.95))]??0)*100)/100});
   activateSite(null);
  }
 }catch(e){
  exceptions.push({seed,mission,error:String(e)});
 }finally{activateSite(null);}
}
const summary=summarizeG4DFlows(rows);
console.log(JSON.stringify({method:'actual motor, AI, visibility and replay; no omniscient orders, no rendered/mobile FPS claim',
 mode,seconds,summary,exceptions,
 failures:rows.filter(r=>r.invalidPositions||r.replayIssues.length),
 rows:options.has('--rows')?rows:rows.map(r=>({
  seed:r.seed,mission:r.mission,mode:r.mode,orders:r.orders,
  reason:r.reason,travel:r.friendlyTravel,
  firstContactAt:r.firstContactAt,blockedFrames:r.blockedFrames,
  silentDoorFrames:r.silentDoorFrames,
  blockedReasons:r.blockedReasons,
  blockedMotorPauses:r.blockedMotorPauses,
  doorCases:r.doorCases,
  p95HostSimMs:r.p95HostSimMs
 }))},null,2));
if(exceptions.length||summary.invalid)process.exitCode=1;
// Explicit, bounded regression gate, not an invariant for all mission kinds.
// The locked SERVICE door must still refuse entry and report the reason.
if(options.has('--door-regression')&&
   (mode!=='matrix'||summary.trials!==20||summary.silentDoorFrames>0)){
 console.error('DNav regression: unrecognized persistent door blockage',
   {trials:summary.trials,silentDoorFrames:summary.silentDoorFrames});
 process.exitCode=1;
}
