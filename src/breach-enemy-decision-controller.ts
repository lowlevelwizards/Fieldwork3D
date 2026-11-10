/** Roadmap 2 / Stage 9 — authoritative enemy AI decisions and report delivery.
 * Only enemy observation evidence can produce an AI contact. All navigation,
 * shot clearance, cover and events still use the game's physical authority.
 * Preserve evaluation order, reaction latency and seeded random behavior.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {type Pt,COVER,WALLS,OPERATOR_RADIUS,doorCenter} from './breach-core.ts';
import {targetAngle,angleDifference,length} from './breach-plan.ts';
import {rotate} from './breach-order-lifecycle.ts';
import type {BattleEvent} from './breach-combat.ts';
import {encounterReactionDelay,encounterReactionPhase} from './breach-encounter-readiness.ts';
import {doorWouldStrikeActors} from './breach-door.ts';
import {doorInteraction} from './breach-interactions.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {aimHeight} from './breach-cover-height.ts';
import {assessFireLane} from './breach-fire-safety.ts';
import {chooseDefense,chooseFiringDefense,watchPoint,reachableInvestigation} from './breach-defense.ts';
import {scanEnemyVisualEvidence} from './breach-ai-visual-evidence.ts';
import {scanEnemySoundEvidence} from './breach-ai-acoustic-perception.ts';
import {soundResponse} from './breach-sound-evidence.ts';
import {observeSuspicion,exhaustSuspicionSearch} from './breach-ai-suspicion.ts';
import {bestBelief,addObservation} from './breach-awareness.ts';
import {reconcileEnemyIntent,reconcileEnemyPosture} from './breach-ai-reconciliation.ts';
import {chooseCombatAction} from './breach-ai-combat.ts';
import {contactTactic,shouldSeekHoldCover} from './breach-ai-tactical-response.ts';
import {reportToListener} from './breach-communication.ts';
import {groupResponse} from './breach-ai-coordination.ts';
import {stableCoordination,renewCoordinationUntil} from './breach-ai-team-commitment.ts';
import {coverMoveDeadline,coverMoveCommitted} from './breach-ai-position-commitment.ts';
import {searchCandidates} from './breach-ai-search.ts';
import {investigationTempo} from './breach-ai-investigation.ts';
import {routineDwellSeconds} from './breach-ai-routine-dwell.ts';
import {pressureAdvanceOpportunity} from './breach-ai-initiative.ts';
import {captureTargetMayWithdraw} from './breach-ai-mission-response.ts';
import {retreatDoorClosureEligible,routineDoorClosureEligible} from './breach-ai-door-response.ts';
import {AiWorkScheduler} from './breach-ai-work-scheduler.ts';

/** The authoritative simulation owns the motor, shot/geometry, visibility and
 * event ports. The AI owns observation response, tactical commitments and
 * delivery of genuinely audible warnings. It does not advance the clock.
 */
export type EnemyDecisionPorts={
 approach:(actor:TeamActor,to:Pt,dt:number,session:Session,speedScale?:number)=>unknown;
 cachedEnemyRoute:(session:Session,from:Pt,to:Pt,physicalDoors?:boolean)=>Pt[];
 requestClearFireStep:(session:Session,actor:TeamActor,target:TeamActor,kind:'muzzle'|'friendly')=>boolean;
 inSight:(observer:TeamActor,subject:TeamActor,session:Session)=>boolean;
 enemies:(session:Session)=>TeamActor[];
 hear:(session:Session,p:Pt,radius:number,kind:string)=>void;
 notify:(session:Session,message:string)=>void;
 battleEvent:(session:Session,kind:BattleEvent['kind'],actor:TeamActor|null,p:Pt,message:string)=>void;
};
const d=(a:Pt,b:Pt)=>length(a,b);
const clone=(p:Pt):Pt=>({...p});
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);

/** Construct once per game module, not once per frame. Simulation-local
 * work budgets are keyed by Session and cannot bleed into another round.
 */
export function createEnemyDecisionController(ports:EnemyDecisionPorts){
 const {approach,cachedEnemyRoute,requestClearFireStep,inSight,
   enemies,hear,notify,battleEvent}=ports;
 const aiSchedulers=new WeakMap<Session,AiWorkScheduler>();
function electiveAiWork(s:Session,a:TeamActor,kind:string):boolean{
  let scheduler=aiSchedulers.get(s);
  if(!scheduler){
    scheduler=new AiWorkScheduler(2,
      s.operators.filter(actor=>actor.side==='red').map(actor=>actor.id));
    aiSchedulers.set(s,scheduler);
  }
  return scheduler.allow(a.id,kind,Math.round(s.seconds*60));
}

function defensivePosition(a:TeamActor,from:Pt,s:Session):Pt|null{
  const others=enemies(s).map(other=>({id:other.id,p:other.p,
    health:other.health,defense:other.defense}));
  return chooseDefense(a.p,from,s.doors,others,a.id);
}
/** Firing reposition differs from a safe withdrawal. It must actually
 * expose a legal muzzle lane to the confirmed visible opponent. */
function firingPosition(a:TeamActor,target:TeamActor,s:Session):Pt|null{
  const others=enemies(s).map(other=>({id:other.id,p:other.p,
    health:other.health,defense:other.defense}));
  return chooseFiringDefense(a.p,target.p,s.doors,others,a.id,
    aimHeight(target.posture==='crouch'));
}
function enemyDecisions(s:Session,a:TeamActor,dt:number){
  if(a.health<=0||a.surrendered)return;
  // The same local clearance motor is available to red and blue, but
  // never outranks a defensive withdrawal or interrupts a timed traversal.
  if(a.fireRetreatTarget){
    const goal=a.fireRetreatTarget;
    if(a.alert==='retreat'||s.seconds>a.fireRetreatUntil||
       d(a.p,goal)<3||!sweptBodyClear(a.p,goal,s.doors)){
      a.fireRetreatTarget=null;a.nav=[];
    }else{
      approach(a,goal,dt,s,.64);
      return;
    }
  }
  if(!a.watch)a.watch=watchPoint(a.p,s.doors);
  const visible=scanEnemyVisualEvidence(s,a,dt,inSight);
  // A guard on the other side of a window can have confirmed sight but
  // an unusable short-stock muzzle. Try the same small backstep available
  // to blue BEFORE normal cover doctrine decides to hold fire forever.
  if(visible.length&&a.velocity<10&&a.magazine>0&&
     (a.encounterReactionUntil??0)<=s.seconds&&
     a.alert!=='retreat'&&!a.fireRetreatTarget){
    const target=visible[0],yaw=angle(a.p,target.p);
    if(Math.abs(angleDifference(a.heading,yaw))<.90){
      const check=weaponClearance({
        x:a.p.x,z:a.p.y,heading:a.heading,weaponYaw:yaw,
        weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,
        aim:a.aim,posture:a.posture,velocity:0,recoil:a.recoil,
        threatRange:d(a.p,target.p)
      },s.doors);
      if(check.blocked&&
         (check.blocker==='wall'||check.blocker==='cover')&&
         requestClearFireStep(s,a,target,'muzzle'))return;
    }
  }
  const strongest=scanEnemySoundEvidence(s,a);
  // A faint noise can turn a head without becoming an indefinitely
  // actionable contact. Do not replace it with a psychic search target.
  if(!visible.length&&!a.contacted&&a.alert==='suspicious'&&a.heard){
    // Continue collecting physical evidence while orienting. Only an
    // actually heard NEW event interrupts this head-turn, not distant
    // hidden gunfire or a globally visible noise event.
    if(s.seconds<a.alertUntil&&!strongest){
      a.velocity=0;rotate(a,angle(a.p,a.heard),dt);return;
    }
    if(s.seconds>=a.alertUntil){a.alert='idle';a.heard=null;}
  }
  reconcileEnemyIntent(s,a,visible.length);
  if(visible.length){
    a.searchOrigin=null;a.searchQueue=[];a.searchPauseUntil=0;
    const b=visible.sort((x,y)=>d(x.p,a.p)-d(y.p,a.p))[0];
    // A fresh surprise first makes the defender orient. The observed target
    // may update WATCH, but no cover sprint or radio report happens before
    // they register contact. Firing remains gated through READY.
    if(encounterReactionPhase(s.seconds,a.encounterReactionStartedAt,
        a.encounterReactionUntil)==='orient'){
      a.contact=clone(b.p);a.watch=clone(b.p);
      a.contacted=true;a.alert='suspicious';a.velocity=0;
      rotate(a,angle(a.p,b.p),dt);return;
    }
    a.contact=clone(b.p);a.alertUntil=s.seconds+3;a.contacted=true;
    if(s.seconds-a.lastReportAt>5){
      s.reports.push({id:s.nextReportId++,senderId:a.id,at:s.seconds,
        origin:clone(a.p),estimate:clone(b.p),uncertainty:35,deliveredTo:[]});
      if(s.reports.length>16)s.reports.shift();
      a.lastReportAt=s.seconds;
      hear(s,a.p,220,'warning');
      battleEvent(s,'intel',a,a.p,a.name+' WARNED NEARBY DEFENDERS');
    }
    a.watch=clone(b.p);
    // Reaction to direct fire follows actual suppression/morale thresholds;
    // high pressure alone no longer forces every personality to sprint.
    // Any cover movement remains physically verified by the motor below.
    // An eye-level contact may be behind solid cover at muzzle height.
    // Reposition to an actual firing lane instead of staring at it while
    // repeatedly attempting blocked shots. Reposition has a cooldown.
    const friends=enemies(s).filter(o=>o!==a&&o.health>0).map(o=>o.p);
    const lane=assessFireLane(a.p,a.posture==='crouch'?18:26,
      b.p,aimHeight(b.posture==='crouch'),COVER,WALLS,s.doors,friends);
    a.combatChoice=chooseCombatAction({visible:true,remembered:true,
      laneClear:lane.blocker==='clear',ammunition:a.magazine,
      suppression:a.suppression,morale:a.morale,temperament:a.personality});
    if(a.combatChoice==='withdraw'&&a.alert!=='retreat'){
      const safe=defensivePosition(a,b.p,s);
      const tactic=contactTactic(a.combatChoice,!!safe&&d(safe,a.p)>11);
      if(tactic.withdraw&&safe){
        a.retreatPoint=safe;a.alert='retreat';a.nav=[];
        a.defenseUntil=s.seconds+3;
      }else{
        // No physically reachable retreat: stop advancing and keep
        // watch instead of attempting an impossible escape.
        a.alert='cover';a.nav=[];a.defense=null;
      }
    }
    if(a.combatChoice==='hold'&&a.alert!=='retreat'){
      // HOLD is not permission to repeatedly cancel and replan movement.
      // Keep an already chosen position; if none exists, request a new
      // physically validated cover spot only on a bounded cooldown.
      if(a.alert!=='cover'&&!a.defense)a.nav=[];
      a.alert='cover';
      if(shouldSeekHoldCover(a.combatChoice,!!a.defense,
           s.seconds,a.defenseUntil)){
        const safe=defensivePosition(a,b.p,s);
        a.defenseUntil=s.seconds+2.5;
        if(safe&&d(safe,a.p)>15){
          a.defense=safe;a.nav=[];
          a.defenseUntil=coverMoveDeadline(s.seconds,d(a.p,safe));
        }
      }
    }
    const committed=coverMoveCommitted(a.alert==='cover'&&!!a.defense,
      a.defense?d(a.p,a.defense):0,s.seconds,a.defenseUntil);
    const initiative=a.combatChoice==='engage'&&
      pressureAdvanceOpportunity({
        personality:a.personality,directSight:true,
        clearFireLane:lane.blocker==='clear',range:d(a.p,b.p),
        suppression:a.suppression,morale:a.morale,
        nearbyAllies:enemies(s).filter(o=>o!==a&&o.health>0&&
          o.encounterGroupId===a.encounterGroupId&&d(o.p,a.p)<150).length,
        secondsSinceLastMove:s.seconds-a.lastFireRepositionAt
      });
    if((a.combatChoice==='reposition'||initiative)&&
      a.alert!=='retreat'&&!committed&&
      s.seconds-a.lastFireRepositionAt>(initiative?6:2.6)){
      const candidate=firingPosition(a,b,s);
      a.lastFireRepositionAt=s.seconds;
      // An aggressive advance must actually shorten the distance to a
      // directly seen contact. The candidate's firearm lane and motor
      // path have already passed the existing physical validation.
      const closesDistance=candidate&&
        d(candidate,b.p)<d(a.p,b.p)-18;
      if(candidate&&d(candidate,a.p)>15&&
         (!initiative||closesDistance)){
        a.defense=candidate;a.alert='cover';a.nav=[];
        a.defenseUntil=coverMoveDeadline(s.seconds,d(a.p,candidate));
      }
    }
    const maneuvering=coverMoveCommitted(a.alert==='cover'&&!!a.defense,
      a.defense?d(a.p,a.defense):0,s.seconds,a.defenseUntil);
    if(a.alert!=='retreat'&&!maneuvering&&
       a.combatChoice!=='hold'&&a.combatChoice!=='withdraw'){
      a.alert='engaging';a.nav=[];
    }
  }else if(s.seconds>a.alertUntil&&a.alert!=='idle'&&
    a.alert!=='retreat'&&a.alert!=='cover'){
    a.alert='investigating';a.contact=a.heard??a.contact;
  }
  reconcileEnemyPosture(s,a,visible);
  const noiseDisposition=strongest?
    soundResponse(strongest.kind,strongest.intensity):'ignore';
  if(strongest&&noiseDisposition==='orient'&&!visible.length&&
     !a.contacted&&a.alert!=='retreat'){
    a.heard=clone(strongest.estimate);a.alert='suspicious';
    a.alertUntil=s.seconds+1.15;a.velocity=0;
    rotate(a,angle(a.p,a.heard),dt);
    return;
  }
  if(strongest&&noiseDisposition!=='orient'&&
     a.encounterReactionUntil===Number.POSITIVE_INFINITY){
    a.encounterReactionStartedAt=s.seconds;
    a.encounterReactionUntil=s.seconds+encounterReactionDelay(
      a.encounterReadiness??'attentive',a.id);
  }
  if(strongest&&!visible.length&&a.alert!=='retreat'){
    a.lastNoiseAt=strongest.at;
    const heard=strongest.estimate;
    a.heard=heard;a.contact=heard;a.watch=clone(heard);
    a.searchOrigin=null;a.searchQueue=[];a.searchPauseUntil=0;
    a.defense=null;
    a.alertUntil=s.seconds+(a.personality==='aggressor'?.5:1.4);
    a.contacted=true;
    const needsCover=a.personality==='cautious'||
      (a.personality==='guard'&&a.morale<.65);
    if(needsCover){
      a.retreatPoint=defensivePosition(a,heard,s);
      a.alert=a.retreatPoint?'retreat':'cover';a.nav=[];
    }else a.alert='investigating';
    rotate(a,angle(a.p,heard),dt);
  }
  // The designated capture target has a different *purpose*, not secret
  // knowledge. Only real direct sight or its own recent audible warning
  // can provoke a move toward an already physically validated safe point.
  const threatEstimate=visible[0]?.p??(
    a.suspicion.stage==='alerted'?(a.heard??a.contact):null);
  const heardAlarm=a.lastNoiseAt>=0&&
    s.seconds-a.lastNoiseAt<6&&a.suspicion.stage==='alerted';
  if(captureTargetMayWithdraw({
    mission:s.missionType,role:a.encounterRole,
    confirmedSight:visible.length>0,heardAlarm,
    hasEstimate:!!threatEstimate,
    isAlreadyWithdrawing:a.alert==='retreat',
    secondsSinceAttempt:s.seconds-a.lastMissionEvadeAt
  })&&threatEstimate){
    a.lastMissionEvadeAt=s.seconds;
    const safe=defensivePosition(a,threatEstimate,s);
    if(safe&&d(safe,a.p)>15&&
       d(safe,threatEstimate)>d(a.p,threatEstimate)+15){
      a.retreatPoint=safe;a.alert='retreat';a.nav=[];
      a.combatChoice='withdraw';
    }
  }
  if(a.flashUntil>s.seconds){
    a.velocity=0;a.aim=0;a.alert='cover';return;
  }
  // An anonymous sound or secondhand report isn't an instantaneous
  // navigation command. First orient toward the uncertain estimate; direct
  // visual contact or retreat preempts this brief assessment.
  if(!visible.length&&a.alert==='investigating'&&a.contact&&
     a.lastNoiseAt>=0){
    const tempo=investigationTempo(a.personality,
      bestBelief(a.awareness)?.uncertainty??65);
    if(s.seconds-a.lastNoiseAt<tempo.orientSeconds){
      a.velocity=0;rotate(a,angle(a.p,a.contact),dt);return;
    }
  }
  // Quiet functional activities use bounded, collision-checked local journeys.
  // Combat reports, seen contacts, or sounds immediately interrupt the routine.
  if(!a.contacted&&!a.contact&&a.alert==='idle'&&a.encounterRoutine?.length){
    if(s.seconds<(a.routinePauseUntil??0)){a.velocity=0;return;}
    const visit=a.routineIndex??0;
    const index=visit%a.encounterRoutine.length;
    const target=a.encounterRoutine[index];
    if(d(a.p,target)<13){
      // A settled occupant may quietly close a nearby hinged leaf after a
      // real journey. Other travelers retain priority over the doorway.
      if(visit%3===1){
        const inUse=s.operators.filter(other=>other!==a&&other.health>0&&
          (other.velocity>5||other.nav.length>0)).map(other=>other.p);
        const door=s.doors.find(candidate=>
          routineDoorClosureEligible(a.p,candidate,s.seconds,
            a.lastEnemyDoorCloseAt,inUse)&&
          !doorWouldStrikeActors(candidate,0,[a.p],OPERATOR_RADIUS));
        if(door&&doorInteraction({target:door,actorId:a.id,
          actorPosition:a.p,action:'close'}).allowed){
          door.open=false;door.openedAt=s.seconds;
          a.lastEnemyDoorCloseAt=s.seconds;
          hear(s,doorCenter(door),62,'door');
          battleEvent(s,'door',a,doorCenter(door),
            a.name+' CLOSED '+door.id+' AFTER ROUTINE');
        }
      }
      a.routineIndex=visit+1;
      a.routinePauseUntil=s.seconds+routineDwellSeconds(a.id,
        a.encounterActivity??'idle',index,visit);
      a.nav=[];a.velocity=0;
      return;
    }
    if(!a.nav.length){
      if(!electiveAiWork(s,a,'routine-route')){
        a.velocity=0;return;
      }
      a.nav=cachedEnemyRoute(s,a.p,target);
    }
    if(!a.nav.length){
      a.routineIndex=visit+1;
      a.routinePauseUntil=s.seconds+4;a.velocity=0;return;
    }
    approach(a,target,dt,s,.52);return;
  }
  // Unprepared occupants do not automatically run to combat positions.
  // Any credible sound or visual contact above interrupts this inactivity.
  if(!a.contacted&&!a.contact&&a.alert==='idle'&&
    (a.encounterReadiness==='relaxed'||a.encounterReadiness==='unaware')){
    a.velocity=0;return;
  }
  if(!a.contacted&&!a.contact&&a.alert==='idle'&&a.watch){
    if(a.defense===null&&s.seconds>=a.defenseUntil&&
       electiveAiWork(s,a,'idle-defense')){
      a.defense=defensivePosition(a,a.watch,s);
      a.defenseUntil=s.seconds+2;
    }
    if(a.defense&&d(a.p,a.defense)>11){
      if(!a.nav.length){
        if(!electiveAiWork(s,a,'idle-route')){
          a.velocity=0;rotate(a,angle(a.p,a.watch),dt);return;
        }
        a.nav=cachedEnemyRoute(s,a.p,a.defense);
      }
      if(!a.nav.length){
        a.defense=null;a.defenseUntil=s.seconds+.7;
      }else{
        approach(a,a.defense,dt,s,.62);
        if(a.nav.length&&!a.squeeze)rotate(a,angle(a.p,a.nav[0]),dt);
        return;
      }
    }
    rotate(a,angle(a.p,a.watch),dt);
  }
  if(a.alert==='retreat'&&a.retreatPoint){
    if(d(a.p,a.retreatPoint)>9){
      approach(a,a.retreatPoint,dt,s);
      if(a.nav.length&&!a.squeeze)rotate(a,angle(a.p,a.nav[0]),dt);
    }else{
      a.alert='cover';a.retreatPoint=null;a.nav=[];
      notify(s,a.name+' TOOK COVER');
      // Only upon REAL physical arrival, and only after a genuinely
      // observed/alarmed retreat, try to close an open nearby door.
      // Closing uses the same interaction gate and physical hinge motor
      // as an authored player action, with no teleport or instant sealing.
      const candidate=s.doors.find(door=>retreatDoorClosureEligible(
        a.p,door,s.seconds,a.lastEnemyDoorCloseAt,
        visible.length>0,a.contact??a.heard));
      if(candidate&&doorInteraction({target:candidate,actorId:a.id,
           actorPosition:a.p,action:'close'}).allowed){
        candidate.open=false;candidate.openedAt=s.seconds;
        a.lastEnemyDoorCloseAt=s.seconds;
        hear(s,doorCenter(candidate),90,'door');
        battleEvent(s,'door',a,doorCenter(candidate),
          a.name+' CLOSED '+candidate.id+' AFTER RETREAT');
      }
    }
    return;
  }
  // WATCH anchors a firing sector; SUPPORT moves into its nearby
  // complementary defensive position. Both know only the reported estimate.
  // Direct vision or severe suppression always overrides the role.
  if((a.coordinationRole==='watch'||a.coordinationRole==='support')&&
     s.seconds<a.coordinationUntil&&!visible.length&&a.suppression<.65){
    a.alert='cover';
    if(a.defense&&d(a.p,a.defense)>10)
      approach(a,a.defense,dt,s,a.coordinationRole==='support'?.82:.65);
    else if(a.watch)rotate(a,angle(a.p,a.watch),dt);
    return;
  }
  if(a.contact){
    rotate(a,angle(a.p,a.contact),dt);
    if(a.alert==='investigating'&&d(a.p,a.contact)>40){
      // Noise gives a region to investigate, never a magic target.
      if(!a.nav.length){
        if(!electiveAiWork(s,a,'investigation-route')){
          a.velocity=0;return;
        }
        const goal=reachableInvestigation(a.p,a.contact,
          (from,to)=>cachedEnemyRoute(s,from,to));
        if(goal)a.nav=cachedEnemyRoute(s,a.p,goal);
        else{a.alert='cover';a.contact=null;a.defense=null;}
      }
      if(a.nav.length&&a.contact)approach(a,a.nav.at(-1)??a.contact,dt,s,
        investigationTempo(a.personality,
          bestBelief(a.awareness)?.uncertainty??65).approachScale);
    }
    if(a.alert==='investigating'&&a.contact&&d(a.p,a.contact)<35){
      const belief=bestBelief(a.awareness);
      const tempo=investigationTempo(a.personality,
        belief?.uncertainty??65);
      if(!a.searchOrigin){
        a.searchOrigin=clone(a.contact);
        a.searchQueue=searchCandidates(a.searchOrigin,
          belief?.uncertainty??65,s.site?.rooms??[],s.doors,COVER);
      }
      if(a.searchPauseUntil===0)
        a.searchPauseUntil=s.seconds+tempo.inspectSeconds;
      // Examine this location before selecting another. Strictly bound
      // reachability checks to avoid a pathfinding spike on contact.
      if(s.seconds<a.searchPauseUntil){
        a.velocity=0;rotate(a,angle(a.p,a.contact),dt);return;
      }
      if(!electiveAiWork(s,a,'search-expand')){
        a.velocity=0;return;
      }
      let next:Pt|null=null,checks=0;
      while(a.searchQueue.length&&!next&&checks++<2){
        const candidate=a.searchQueue.shift()!;
        if(d(candidate,a.p)<24)continue;
        next=reachableInvestigation(a.p,candidate,
          (from,to)=>cachedEnemyRoute(s,from,to));
      }
      a.nav=[];
      if(next){
        a.contact=clone(next);
        // Inspect only after arriving at the next search point.
        a.searchPauseUntil=0;
      }else if(!a.searchQueue.length){
        a.alert='cover';a.contact=null;a.searchOrigin=null;
        exhaustSuspicionSearch(a.suspicion,s.seconds);
        a.searchPauseUntil=0;
        a.defense=defensivePosition(a,a.heard??a.p,s);
        a.defenseUntil=s.seconds+6;
      }else{
        // Keep the current estimate; inspect the remaining candidates on
        // another fixed simulation tick instead of looping through all.
        a.velocity=0;
      }
    }
  }
  if(a.alert==='cover'&&a.defense&&d(a.p,a.defense)>10){
    if(!a.nav.length)a.nav=cachedEnemyRoute(s,a.p,a.defense);
    if(a.nav.length)approach(a,a.defense,dt,s,.7);
    else{a.defense=null;a.defenseUntil=s.seconds+.8;}
  }
  if(!a.contact&&a.watch)rotate(a,angle(a.p,a.watch),dt);
}
/** A verbal warning only reaches physically audible allies; no team hive mind. */
function distributeReports(s:Session){
 for(const report of s.reports){
  if(s.seconds-report.at>1.5)continue;
  const newlyInformed:string[]=[];
  for(const recipient of enemies(s)){
   if(recipient.health<=0||report.deliveredTo.includes(recipient.id))continue;
   const observation=reportToListener(report,recipient.id,recipient.p,
     s.doors,WALLS,s.seconds);
   if(!observation)continue;
   report.deliveredTo.push(recipient.id);
   newlyInformed.push(recipient.id);
   addObservation(recipient.awareness,observation);
   observeSuspicion(recipient.suspicion,{
     id:observation.id,at:s.seconds,kind:'report',
     cause:'heard-verbal-warning'
   });
   if(recipient.intent?.kind!=='engage'){
    recipient.heard=clone(observation.estimate);
    recipient.contact=clone(observation.estimate);
    recipient.lastNoiseAt=s.seconds;
    recipient.contacted=true;
    recipient.alert='investigating';
    recipient.nav=[];
   }
  }
  // A report may reach another ally on a later tick. The earlier
  // investigator keeps their role; only newcomers receive fresh orders.
  // Never coordinate an actor who did not actually hear the report.
  if(!newlyInformed.length)continue;
  const listeners=enemies(s).filter(a=>a.health>0&&
    report.deliveredTo.includes(a.id));
  const prior=stableCoordination(listeners,s.seconds);
  const roles=groupResponse(listeners.map(a=>({id:a.id,p:a.p})),
    report.estimate,{...(report.assignedRoles??{}),...prior});
  report.assignedRoles=roles;report.coordinated=true;
  for(const a of listeners){
   if(!newlyInformed.includes(a.id))continue;
   a.coordinationRole=roles[a.id];
   const heard=a.awareness.observations.find(observation=>
     observation.id==='report/'+report.id+'/'+a.id);
   a.coordinationUntil=renewCoordinationUntil(s.seconds,a.coordinationUntil,
     roles[a.id],heard?.uncertainty??report.uncertainty);
   const covering=roles[a.id]==='watch'||roles[a.id]==='support';
   if(covering&&a.intent?.kind!=='engage'){
     a.watch=clone(report.estimate);
     // Existing cover selection considers friendly defender occupancy;
     // this avoids assigning everyone to the same local cover spot.
     a.defense=defensivePosition(a,report.estimate,s);
     a.defenseUntil=Math.min(a.coordinationUntil,s.seconds+7);
     a.alert='cover';a.nav=[];
   }
  }
 }
}

 return {decide:enemyDecisions,distributeReports};
}
