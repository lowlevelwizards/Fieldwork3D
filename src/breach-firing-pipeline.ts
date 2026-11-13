import {safetyBodyFor} from './breach-friendly-safety-volume.ts';
import {chooseMicroAimOffset,approachMicroAimOffset,allowMicroAim}
 from './breach-physical-micro-aim.ts';
import {canContextuallyCrouch,validRearStack,contextualCrouchRecovery}
 from './breach-contextual-crouch.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {createShotResolver} from './breach-shot-resolution.ts';
import {createShotEnvironmentCommitter} from './breach-shot-environment.ts';
/** Roadmap 2 / Stage 10 — unified authoritative firing & damage pipeline.
 * Extraction preserves original 60 Hz call order, seeded RNG draws, shot
 * identity, ammunition, civilian safety, penetration and replay evidence.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {BattleEvent} from './breach-combat.ts';
import {rotate} from './breach-order-lifecycle.ts';
import {segmentImpact,strikeSurface} from './breach-ballistic-resolution.ts';
import {incomingHitFacing,choosePhysicalCorrection} from './breach-combat-reactions.ts';

import {type Pt,segmentsCross,pointToSegment} from './breach-core.ts';
import {length,targetAngle,angleDifference} from './breach-plan.ts';
import {WEAPONS} from './breach-combat.ts';
import {aimHeight} from './breach-cover-height.ts';
import {assessFireLane,assessFriendlyLane,fireLaneReachable} from './breach-fire-safety.ts';
import {selectFireableContact} from './breach-target-selection.ts';
import {acquisitionSeconds} from './breach-firing-cadence.ts';



import {windowPaneSegment} from './breach-windows.ts';
import {type CivilianActor} from './breach-civilian-types.ts';
import {firstCivilianAlongRay,applyCivilianBulletHit} from './breach-civilian-ballistics.ts';
import {knownCivilianInFireLane} from './breach-civilian-fire-safety.ts';
import {recordCivilianHarm} from './breach-civilian-harm.ts';
import {contactTactic} from './breach-ai-tactical-response.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {weaponHandlingModifiers,sightAcquisitionScale,sightSpreadScale} from './equipment-weapon-handling.ts';
import {skillMultiplier} from './breach-skills.ts';
import {BALLISTICS,approachAngle,readyMode,dispersion,shotYaw,muzzleEndpoint,recoverWeapon} from './breach-ballistics.ts';

import {weaponClearance} from './breach-weapon-clearance.ts';
import {fireUrgency,passiveAimReadiness,contactAimOnAcquisition,
 contactAcquisitionScale,contactTurnScale,urgentFireMode}
 from './breach-fire-urgency.ts';

import {retainImpactMark} from './breach-impact-evidence-buffer.ts';
import {CASING_LIMIT} from './breach-effects.ts';




/** Ports to the authoritative game clock and physical world.
 * No second scheduler, RNG source or visual/replay-driven fire authority.
 */
export type CombatFiringPorts={
 team:(session:Session)=>TeamActor[];
 enemies:(session:Session)=>TeamActor[];
 inSight:(observer:TeamActor,target:TeamActor,session:Session)=>boolean;
 isSeen:(session:Session,target:TeamActor)=>boolean;
 liveVisibility:(session:Session,point:Pt)=>boolean;
 unobstructed:(a:Pt,b:Pt,session:Session,lowBlocks:boolean)=>boolean;
 beginReload:(session:Session,actor:TeamActor)=>unknown;
 advanceReload:(session:Session,actor:TeamActor,dt:number)=>unknown;
 notify:(session:Session,message:string)=>void;
 hear:(session:Session,point:Pt,radius:number,kind:string)=>void;
 battleEvent:(session:Session,kind:BattleEvent['kind'],
  actor:TeamActor|null,point:Pt,message:string)=>void;
};
const d=(a:Pt,b:Pt)=>length(a,b);
const clone=(p:Pt):Pt=>({...p});
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);

/** A single controller created once, with immutable ports. The session owns
 * all mutations, deterministic RNG consumption and physically verified hits.
 */
export function createCombatFiringPipeline(ports:CombatFiringPorts){
 const {team,enemies,inSight,isSeen,liveVisibility,unobstructed,
  beginReload,advanceReload,notify,hear,battleEvent}=ports;
function random(s:Session){
  s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;
  return s.rng/4294967296;
}
/** Shared post-ignition impact authority. Aim and LOS never call these. */
 const shotEnvironment=createShotEnvironmentCommitter({enemies,hear,battleEvent});
 const {emitMaterialEvents,damageStruckCover,
  shatterStruckDoorGlass,shatterStruckWindows}=shotEnvironment;
/** One physically authoritative shot resolver for this game session. */
 const {commitShot}=createShotResolver({
  team,enemies,isSeen,liveVisibility,hear,notify,battleEvent,random,
  observedCivilianFireLane,civilianShotWithheld,requestClearFireStep,
  ...shotEnvironment
 });

/** A known civilian can veto a shot without becoming a hidden contact.
 * Physical impacts are still tested against every real neutral after firing. */
function observedCivilianFireLane(s:Session,a:TeamActor,from:Pt,
 muzzleHeight:number,to:Pt,targetHeight:number):CivilianActor|null{
 if(a.side!=='blue'||!s.civilians.length)return null;
 const observed=s.civilians.filter(c=>c.health>0&&
   d(a.p,c.p)<260&&
   Math.abs(angleDifference(a.heading,angle(a.p,c.p)))<1.2&&
   liveVisibility(s,c.p)&&unobstructed(a.p,c.p,s,false));
 return knownCivilianInFireLane(from,muzzleHeight,to,targetHeight,observed);
}
function civilianShotWithheld(s:Session,a:TeamActor):void{
 a.lastFireBlock='friendly';
 if(s.seconds-a.lastLaneWarnAt>2){
   notify(s,a.name+' CIVILIAN IN FIRE LANE — SHOT WITHHELD');
   a.lastLaneWarnAt=s.seconds;
 }
}
/** Request one tiny *physical* firing-lane recovery, preserving tactical
 * plans, gaze/watch orders and fire policy. Both sides can solve short-stock
 * obstruction. Blue may also sidestep an allied line of fire.
 */
function requestClearFireStep(s:Session,a:TeamActor,target:TeamActor,
 kind:'muzzle'|'friendly'):boolean{
 // The stock/arms are still traveling toward a verified smaller solution:
 // allow that real movement to finish before asking the feet to sidestep.
 if(kind==='friendly'&&Math.abs((a.aimSideOffset??0)-
   (a.aimSideTarget??0))>.3)return false;
 if(!inSight(a,target,s)||a.health<=0||a.velocity>=10||
   a.fireRetreatTarget||s.seconds-a.lastFireRetreatAt<1.9||
   a.traversal||a.traversalPending||a.squeeze||a.carryingId||
   a.treatmentActive||a.reload>0||a.flashUntil>s.seconds||
   a.pace==='run'||a.plan[0]?.moveMode==='sprint'||
   a.plan[0]?.kind==='treat'||a.plan[0]?.kind==='evacuate'||
   a.plan[0]?.kind==='tool'||a.plan[0]?.kind==='flash'||
   a.side==='red'&&(a.alert==='retreat'||a.combatChoice==='withdraw')||
   a.side==='blue'&&(a.firePolicy==='hold'||
     a.firePolicy==='suppress'||
     a.firePolicy==='return'&&a.suppression<.10&&
       s.seconds-a.lastHitAt>3))return false;
 if(kind==='friendly'&&a.side!=='blue')return false;
 const n=a.plan[0];
 if(a.side==='blue'&&n&&n.kind!=='move'&&n.kind!=='look'&&
   n.kind!=='wait')return false;
 const friends=s.operators.filter(other=>other!==a&&other.health>0&&
   other.side===a.side).map(safetyBodyFor);
 // Recovery must never rely on moving another body to open the lane.
 const people=[
   ...s.operators.filter(other=>other!==a&&other.health>0).map(o=>o.p),
   ...s.civilians.filter(c=>c.health>0).map(c=>c.p)
 ];
 const aimYaw=angle(a.p,target.p);
 const clearBody=(candidate:Pt)=>
   sweptBodyClear(a.p,candidate,s.doors,8,sessionWorldGeometry(s))&&
   people.every(p=>{
    const start=d(a.p,p),end=d(candidate,p);
    // A stack may ALREADY be closer than normal comfortable spacing.
    // Permit a tiny step only when it increases separation throughout
    // the move; the unchanged physical motor remains the final authority.
    if(start<20)return end>=start+1&&
      pointToSegment(p,{a:a.p,b:candidate})>=start-.15;
    return pointToSegment(p,{a:a.p,b:candidate})>=20;
   });
 const legalShot=(candidate:Pt)=>{
   // Preview where the weapon will truly point *after* the feet move.
   const candidateYaw=angle(candidate,target.p);
   const candidateRange=d(candidate,target.p);
   const clearance=weaponClearance({
     x:candidate.x,z:candidate.y,heading:a.heading,weaponYaw:candidateYaw,
     shoulderOffset:a.aimSideOffset??0,weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,
     aim:a.aim,posture:a.posture,velocity:0,recoil:a.recoil,
     threatRange:candidateRange
   },s.doors,sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls,
     friends);
   if(clearance.blocked)return false;
   const from={x:clearance.muzzle.x,y:clearance.muzzle.z};
   const height=aimHeight(target.posture==='crouch');
   const far=muzzleEndpoint(from,clearance.muzzle.yaw,
     Math.max(170,d(from,target.p)+38));
   const farHeight=clearance.muzzle.y+(height-clearance.muzzle.y)*
      d(from,far)/Math.max(1,d(from,target.p));
   if(observedCivilianFireLane(s,a,from,clearance.muzzle.y,
     far,farHeight))return false;
   if(assessFriendlyLane(from,clearance.muzzle.y,far,farHeight,
     friends).blocker==='friendly')return false;
   return assessFireLane(from,clearance.muzzle.y,target.p,height,
      sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls,s.doors,friends).blocker==='clear';
 };
 const correction=choosePhysicalCorrection(a.p,aimYaw,kind,
   clearBody,legalShot);
 if(!correction)return false;
 const next=correction.point;
 a.fireRetreatTarget=next;
 a.fireRetreatReason=correction.kind;
 // A few units of foot correction must not inherit the full duration
 // of an emergency 28-unit sidestep; preserve a deterministic upper bound.
 const correctionLength=d(a.p,next);
 a.fireRetreatUntil=s.seconds+Math.max(.55,Math.min(1.25,
   correctionLength/30+.50));
 a.lastFireRetreatAt=s.seconds;
 a.nav=[];a.retryRouteAt=0;
 return true;
}
/** Suppression is an authored area instruction: deliberate misses consume
 * real ammunition and can unsettle defenders, but never inflict an
 * omniscient hit on an unseen actor. */
function fireSuppression(s:Session,a:TeamActor,dt:number){
  const point=a.suppressPoint;
  if(!point||a.fireCd>0)return;
  const mods=weaponHandlingModifiers(a.weaponConfiguration);
  a.weaponYaw=approachAngle(a.weaponYaw,angle(a.p,point),dt*4.5*mods.turn);
  a.aim=Math.min(1,a.aim+dt*1.3);
  if(a.aim<.65||Math.abs(angleDifference(a.weaponYaw,
    angle(a.p,point)))>.18)return;
  if(Math.abs(angleDifference(a.heading,a.weaponYaw))>.87){
    rotate(a,a.weaponYaw,dt,s);return;
  }
  const spread=dispersion(a.weapon,'ads',a.stability,a.velocity>10,
    a.suppression,a.injuryStage,a.recoil)*.9*
    sightSpreadScale(mods,'ads',d(a.p,point));
  const proposedYaw=shotYaw(a.weaponYaw,spread,random(s),random(s));
  const clearance=weaponClearance({x:a.p.x,z:a.p.y,
    heading:a.heading,weaponYaw:proposedYaw,shoulderOffset:a.aimSideOffset??0,
    weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil},s.doors,sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls);
  if(clearance.blocked)return;
  const muzzle=clearance.muzzle;
  const yaw=muzzle.yaw;
  const from={x:muzzle.x,y:muzzle.z};
  const far=muzzleEndpoint(from,yaw,Math.max(40,d(from,point)));
  const friends=team(s).filter(o=>o!==a&&o.health>0).map(safetyBodyFor);
  if(observedCivilianFireLane(s,a,from,muzzle.y,far,14)){
    civilianShotWithheld(s,a);return;
  }
  if(assessFriendlyLane(from,muzzle.y,far,14,friends).blocker==='friendly')return;
  const impact=strikeSurface(from,far,s,muzzle.y,14,
    WEAPONS[a.weapon].penetration);
  const victim=firstCivilianAlongRay(from,yaw,
    d(from,impact.end),s.civilians,{
      muzzleHeight:muzzle.y,farHeight:14,farDistance:d(from,far)
    });
  const fraction=victim?Math.min(1,victim.along/Math.max(1,d(from,far))):1;
  const reachedPanes=impact.paneHits.filter(index=>{
    const pane=s.windows[index];
    if(!pane)return false;
    const at=segmentImpact(from,far,windowPaneSegment(pane));
    return at!==null&&at<=fraction+.0001;
  });
  shatterStruckWindows(s,reachedPanes,Math.max(1,WEAPONS[a.weapon].damage));
  shatterStruckDoorGlass(s,impact.glassDoorHits,fraction);
  damageStruckCover(s,impact.coverHits,WEAPONS[a.weapon].damage*.36,fraction);
  emitMaterialEvents(s,from,far,impact.materialHits,fraction);
  a.fireCd=WEAPONS[a.weapon].interval*1.6;
  a.magazine--;a.shots++;a.lastShotAt=s.seconds;
  a.recoil=Math.min(.9,a.recoil+BALLISTICS[a.weapon].recoilKick*mods.recoilKick);
  a.stability=Math.max(0,a.stability-.13);
  const shotId=s.nextShotId++;
  const hit=!!victim;
  const end=victim?clone(victim.actor.p):impact.end;
  const surface=hit?'blood' as const:impact.surface;
  const height=hit?20:impact.surface==='dust'?1:14;
  const before=victim?.actor.health??0;
  const after=hit?Math.max(0,before-1):0;
  s.shots.push({id:shotId,shooterId:a.id,
    targetId:victim?.actor.id??null,start:from,end,age:0,hit,
    side:a.side,shotYaw:yaw,mode:'ads',spread,muzzleHeight:muzzle.y,
    impactHeight:height,firedAt:s.seconds,
    healthBefore:before,healthAfter:after,down:hit&&after<=0,
    surface});
  retainImpactMark(s,{id:s.nextEffectId++,p:clone(end),
    surface,height,age:0});
  if(victim){
    const harm=applyCivilianBulletHit(victim.actor,s.seconds);
    recordCivilianHarm(s.civilianHarmEvents,{
      id:shotId,shotId,at:s.seconds,victimId:victim.actor.id,
      actorId:a.id,sourceSide:a.side,before:harm.before,
      after:harm.after,severity:harm.down?'incapacitated':'injured',
      p:clone(victim.actor.p)
    });
  }

  s.casings.push({id:shotId,at:s.seconds,weapon:a.weapon,side:a.side,
    x:muzzle.x-4*Math.cos(yaw),z:muzzle.z-4*Math.sin(yaw),
    y:muzzle.y-3,heading:yaw});
  if(s.casings.length>CASING_LIMIT)s.casings.shift();
  s.sparks.push({p:clone(a.p),side:a.side,age:0});
  hear(s,a.p,WEAPONS[a.weapon].noise*mods.noise,'gunshot');
  battleEvent(s,'shot',a,a.p,a.name+' SUPPRESSING AREA');
  for(const e of enemies(s)){
    if(e.health<=0||d(e.p,impact.end)>50)continue;
    if(sessionWorldGeometry(s).walls.some(w=>segmentsCross({a:impact.end,b:e.p},w)))continue;
    e.suppression=Math.min(1,e.suppression+.16);
    e.morale=Math.max(0,e.morale-.025);
  }
}
/** A3.3 shared-height team fire: the lead voluntarily crouches only if
 * an already-acquired rear contact has a safe *actual muzzle* over their
 * crouched helmet. Never changes the teammate or authored orders.
 * The motor/footstep system still owns every physical stance transition.
 */
function updateContextualCrouch(s:Session,a:TeamActor):void{
 if(a.side!=='blue')return;
 const busy=a.health<=0||a.surrendered||a.velocity>3||
   a.traversal!==null||a.squeeze||a.reload>0||
   !!a.treatmentActive||!!a.carryingId||
   a.plan.some(n=>n.kind==='move'||n.kind==='door'||n.kind==='tool'||
     n.kind==='treat'||n.kind==='flash'||n.entryDoorId!==undefined)||
   a.aim>.26||a.pace==='run';
 const automatic=a.autoCrouchOriginal==='stand';
 if(a.postureWasAuthored||busy){
  if(automatic){a.posture='stand';a.autoCrouchOriginal=null;}
  a.autoCrouchUntil=0;return;
 }
 if(!canContextuallyCrouch({
  stationary:true,busy:false,authoredPosture:!!a.postureWasAuthored,
  posture:a.posture,originallyAutomatic:automatic
 }))return;
 // Existing lease prevents permanent polling and frequent stance toggles.
 if(s.seconds-(a.lastAutoCrouchProbeAt??-100)<.18)return;
 a.lastAutoCrouchProbeAt=s.seconds;
 let helpful=false;
 const world=sessionWorldGeometry(s);
 for(const rear of team(s)){
  if(rear===a||rear.health<=0||rear.aim<.16||
     rear.velocity>10||rear.firePolicy==='hold'||!rear.targetId)
   continue;
  const target=s.operators.find(o=>o.id===rear.targetId&&
    o.side!==a.side&&o.health>0);
  if(!target||!inSight(rear,target,s)||
    !validRearStack({...rear.p,heading:rear.heading},a.p,target.p))
   continue;
  const clearance=weaponClearance({x:rear.p.x,z:rear.p.y,
    heading:rear.heading,weaponYaw:rear.weaponYaw,
    shoulderOffset:rear.aimSideOffset??0,
    weapon:rear.weapon,weaponConfiguration:rear.weaponConfiguration,
    equipment:rear.equipment,aim:rear.aim,posture:rear.posture,
    velocity:rear.velocity,recoil:rear.recoil,
    threatRange:d(rear.p,target.p)},s.doors,world.cover,world.walls);
  if(clearance.blocked)continue;
  const origin={x:clearance.muzzle.x,y:clearance.muzzle.z},
    targetHeight=aimHeight(target.posture==='crouch');
  const frontBody={...a.p,posture:'stand' as const},
    crouchedBody={...a.p,posture:'crouch' as const};
  if(assessFriendlyLane(origin,clearance.muzzle.y,
       target.p,targetHeight,[frontBody]).blocker!=='friendly'||
     assessFriendlyLane(origin,clearance.muzzle.y,
       target.p,targetHeight,[crouchedBody]).blocker!=='clear')
    continue;
  // Confirm the same benefit on the REAL outgoing barrel line. The
  // near-target line alone may point slightly away from a shifted muzzle.
  const outgoing=muzzleEndpoint(origin,clearance.muzzle.yaw,
    Math.max(170,d(origin,target.p)+38));
  const farHeight=clearance.muzzle.y+(targetHeight-clearance.muzzle.y)*
    d(origin,outgoing)/Math.max(1,d(origin,target.p));
  if(assessFriendlyLane(origin,clearance.muzzle.y,outgoing,farHeight,
       [frontBody]).blocker!=='friendly'||
     assessFriendlyLane(origin,clearance.muzzle.y,outgoing,farHeight,
       [crouchedBody]).blocker!=='clear')
    continue;
  const remaining=team(s).filter(o=>o!==a&&o!==rear&&o.health>0)
    .map(safetyBodyFor);
  if(assessFriendlyLane(origin,clearance.muzzle.y,target.p,
      targetHeight,remaining).blocker==='friendly')continue;
  if(assessFriendlyLane(origin,clearance.muzzle.y,outgoing,farHeight,
      remaining).blocker==='friendly')continue;
  if(assessFireLane(origin,clearance.muzzle.y,target.p,targetHeight,
      world.cover,world.walls,s.doors,remaining).blocker!=='clear')
    continue;
  if(observedCivilianFireLane(s,rear,origin,clearance.muzzle.y,
      target.p,targetHeight))continue;
  helpful=true;break;
 }
 const lease=contextualCrouchRecovery({
  autoUntil:a.autoCrouchUntil??0,now:s.seconds,
  authored:!!a.postureWasAuthored,busy,advantage:helpful
 });
 a.autoCrouchUntil=lease.until;
 if(lease.crouch){
  if(!automatic)a.autoCrouchOriginal='stand';
  a.posture='crouch';
 }else if(automatic){
  a.posture='stand';a.autoCrouchOriginal=null;
 }
}
/** A3.2: an authored LOOK/WATCH can physically sight down an empty
 * sector without inventing a hostile contact or granting shot permission.
 * The same shoulder candidate limits and real environment are used as
 * combat; this is only a passive ready posture until a target is acquired.
 */
function updatePassiveWatchMicroAim(s:Session,a:TeamActor):void{
 const watch=a.aimInstruction;
 if(a.side!=='blue'||a.health<=0||!watch||watch.source==='stack'||
    a.targetId!==null&&a.aim>.20||a.velocity>=10||
    a.reload>0||!!a.traversal||a.squeeze||a.pace==='run'||
    a.treatmentActive||a.carryingId!==null||
    ['door','tool','treat','reload','flash'].includes(a.plan[0]?.kind??''))
   return;
 if(s.seconds-(a.lastAimSideProbeAt??-100)<.16)return;
 a.lastAimSideProbeAt=s.seconds;
 const yaw=watch.mode==='fixed'&&watch.angle!==undefined?
    watch.angle:watch.point?
    angle(a.p,watch.point):a.weaponYaw;
 const friends=team(s).filter(other=>other!==a&&other.health>0)
   .map(safetyBodyFor);
 if(!friends.length){a.aimSideTarget=0;return;}
 const world=sessionWorldGeometry(s);
 const clear=(offset:number)=>{
  const candidate=weaponClearance({x:a.p.x,z:a.p.y,
    heading:a.heading,weaponYaw:yaw,shoulderOffset:offset,
    weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,
    equipment:a.equipment,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil},
   s.doors,world.cover,world.walls,friends);
  if(candidate.blocked)return false;
  const from={x:candidate.muzzle.x,y:candidate.muzzle.z};
  const far=muzzleEndpoint(from,candidate.muzzle.yaw,155);
  return assessFriendlyLane(from,candidate.muzzle.y,far,candidate.muzzle.y,
    friends).blocker==='clear'&&
   assessFireLane(from,candidate.muzzle.y,far,candidate.muzzle.y,
    world.cover,world.walls,s.doors,friends).blocker==='clear';
 };
 a.aimSideTarget=clear(0)?0:
   chooseMicroAimOffset(a.aimSideOffset??0,clear).offset;
}
/** Passive readiness remains useful under HOLD/RETURN orders; shot policy
 * stays authoritative and never grants a target or actual fire permission. */
function settlePassiveAim(a:TeamActor,dt:number):void{
 const watch=a.aimInstruction;
 const urgency=fireUrgency({
  confirmed:false,
  suspicious:a.suspicion.stage==='curious'||
    a.suspicion.stage==='suspicious'||
    a.suspicion.stage==='alerted'||
    a.alert==='investigating'&&!!a.contact,
  authored:!!watch&&watch.source!=='stack',
  aimMode:watch?.mode
 });
 const ready=passiveAimReadiness(urgency),step=dt*
   (urgency==='suspect'?1.8:urgency==='watch'?1.2:.90);
 a.aim+=Math.max(-step,Math.min(step,ready-a.aim));
}
function fire(s:Session,a:TeamActor,dt:number){
 updateContextualCrouch(s,a);
 // A3.2: only simulation time moves the tactical rifle accommodation.
 // Renderer/replay cannot initiate an offset or authorize a shot.
 if(a.health<=0||a.reload>0||a.traversal||a.squeeze||
    (a.firePolicy==='hold'||a.firePolicy==='suppress')&&
       (!a.aimInstruction||a.aimInstruction.source==='stack')||
    a.pace==='run'||a.plan[0]?.kind==='tool'||
    a.plan[0]?.kind==='treat'||a.plan[0]?.kind==='door')
   a.aimSideTarget=0;
 a.aimSideOffset=approachMicroAimOffset(
   a.aimSideOffset??0,a.aimSideTarget??0,dt);
 updatePassiveWatchMicroAim(s,a);
  if(a.health<=0){
    a.reload=0;a.reloadMode=null;return;
  }
  // Reload independently of sprint/no-target exits. An empty gun begins
  // its emergency reload as soon as both hands are available.
  if(a.reload>0){advanceReload(s,a,dt);return;}
  if(a.magazine<=0){
    if(a.reserve>0&&!a.traversal&&!a.squeeze&&!a.carryingId&&
       !a.treatmentActive&&a.plan[0]?.kind!=='treat')beginReload(s,a);
    return; // No shots, including after the last reserve magazine is spent.
  }
  // Encounter actors cannot fire during their first perceptual reaction.
  // Infinity means they have not yet received evidence of a threat.
  if(a.side==='red'&&(a.encounterReactionUntil??0)>s.seconds){
    a.aim=Math.max(0,a.aim-dt*2);return;
  }
  if(a.carryingId){a.aim=Math.max(0,a.aim-dt*3);return;}
  // Medical intervention occupies both hands; no free shots while treating.
  if(a.plan[0]?.kind==='treat'||a.treatmentActive){
    a.aim=Math.max(0,a.aim-dt*3);return;
  }
  // Hands are supporting a vault or window climb. Suppress firing until
  // the verified landing; otherwise muzzle traces would originate at floor
  // height while the body is airborne.
  if(a.traversal){a.aim=Math.max(0,a.aim-dt*3);return;}
  // Shoulder-first passage keeps the long weapon tucked until clear.
  if(a.squeeze){a.aim=Math.max(0,a.aim-dt*2);return;}
  // Sprinting is a traversal decision, not free accurate fire on the move.
  if(a.pace==='run'||a.plan[0]?.moveMode==='sprint'){
    a.aim=Math.max(0,a.aim-dt*2.2);
    a.weaponYaw=approachAngle(a.weaponYaw,a.heading,dt*4);
    return;
  }
  const profile=BALLISTICS[a.weapon];
  const mods=weaponHandlingModifiers(a.weaponConfiguration);
  const recovering=recoverWeapon(a.recoil,a.stability,dt*mods.recovery,
   profile,a.velocity>10);
  a.recoil=recovering.recoil;a.stability=recovering.stability;
  // An abrupt turn disturbs the actual weapon state, even if movement
  // speed is zero. It takes time to settle the sights again.
  if(a.turning>.12)a.stability=Math.max(0,a.stability-
    dt*Math.min(1.6,a.turning*.30));

  if(a.flashUntil>s.seconds){a.aim=0;return;}
  // R8B: tactical HOLD/WITHDRAW must actually cease shooting. These
  // decisions originate in direct observations, not remembered targets.
  if(a.side==='red'&&contactTactic(a.combatChoice,false).holdFire){
    a.aim=Math.max(0,a.aim-dt*.25);return;
  }
  if(a.side==='blue'){
    if(a.firePolicy==='hold'){
      settlePassiveAim(a,dt);return;
    }
    if(a.firePolicy==='return'&&a.suppression<.10&&
      s.seconds-a.lastHitAt>3){
      settlePassiveAim(a,dt);return;
    }
    if(a.firePolicy==='suppress'){
      fireSuppression(s,a,dt);return;
    }
  }
  const enemiesOf=a.side==='blue'?enemies(s):team(s);
  const visible=enemiesOf.filter(e=>inSight(a,e,s));
  // Legacy FOCUS saves use ordinary acquisition rather than an
  // inaccessible exclusive lock after FOCUS is removed from the interface.
  // Acquisition tests the SAME actual muzzle origin, height and friendly
  // body trajectory as ignition. The candidate-facing preview is only a
  // feasibility test; shot-time still rechecks the true settled weapon yaw.
  const world=sessionWorldGeometry(s);
  const friends=s.operators.filter(other=>other!==a&&other.health>0&&
    other.side===a.side).map(safetyBodyFor);
  const target=selectFireableContact(a.p,visible,a.targetId,candidate=>{
    const clearance=weaponClearance({x:a.p.x,z:a.p.y,
      heading:a.heading,weaponYaw:angle(a.p,candidate.p),
      shoulderOffset:a.aimSideOffset??0,weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,
      equipment:a.equipment,aim:a.aim,posture:a.posture,
      velocity:a.velocity,recoil:a.recoil,threatRange:d(a.p,candidate.p)},
      s.doors,world.cover,world.walls);
    if(clearance.blocked)return false;
    const from={x:clearance.muzzle.x,y:clearance.muzzle.z};
    const h=aimHeight(candidate.posture==='crouch');
    if(observedCivilianFireLane(s,a,from,clearance.muzzle.y,
       candidate.p,h)){
      civilianShotWithheld(s,a);return false;
    }
    if(assessFriendlyLane(from,clearance.muzzle.y,candidate.p,h,
      friends).blocker==='friendly')return false;
    const lane=assessFireLane(from,clearance.muzzle.y,candidate.p,h,
      world.cover,world.walls,s.doors,friends);
    if(lane.blocker==='clear')return true;
    if(lane.blocker!=='cover')return false;
    const preview=strikeSurface(from,candidate.p,s,
      clearance.muzzle.y,h,WEAPONS[a.weapon].penetration);
    return fireLaneReachable(lane,preview,candidate.p);
  });
  if(!target){
    a.aimSideTarget=0;
    a.targetId=null;
    // LOOK/WATCH/suspicion prepare the actual rifle even if no enemy can
    // currently be seen. They never fabricate or authorize a shot.
    settlePassiveAim(a,dt);
    const canPreferClearLook=a.velocity<6&&!a.aimInstruction&&
      a.side==='blue'&&!a.traversal&&!a.squeeze&&
      !['look','door','tool','treat','reload','flash'].includes(
        a.plan[0]?.kind??'');
    if(canPreferClearLook&&s.seconds-(a.lastClearLookProbeAt??-10)>.48){
      a.lastClearLookProbeAt=s.seconds;
      const probe=(yaw:number)=>weaponClearance({
        x:a.p.x,z:a.p.y,heading:a.heading,weaponYaw:yaw,
        weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,
        equipment:a.equipment,aim:0,posture:a.posture,
        velocity:0,recoil:0
      },s.doors,sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls);
      const blocked=probe(a.heading).obstruction;
      a.clearLookBearing=null;
      if(blocked){
        // Only a 20-degree unobstructed alternative is considered.
        // The real muzzle, not a head-only illusion, selects the bearing.
        for(const delta of [-.16,.16,-.34,.34]){
          const clearance=probe(a.heading+delta);
          if(!clearance.obstruction&&!clearance.blocked){
            a.clearLookBearing=a.heading+delta;break;
          }
        }
      }
    }
    const alternate=canPreferClearLook&&
      a.clearLookBearing!==null&&a.clearLookBearing!==undefined&&
      Math.abs(angleDifference(a.heading,a.clearLookBearing))<.38?
      a.clearLookBearing:a.heading;
    a.weaponYaw=approachAngle(a.weaponYaw,alternate,
      dt*profile.turnSpeed*mods.turn);
    return;
  }
  // A3.2: only a confirmed visible contact may trigger a bounded physical
  // shoulder shift. Candidate shot lines use the SAME muzzle+IK fit as live
  // ignition and preserve the independent civilian and teammate vetoes.
  const microAllowed=a.side==='blue'&&allowMicroAim({
    moving:a.velocity,busy:!!a.traversal||a.squeeze||a.reload>0||
      !!a.treatmentActive||a.carryingId!==null||
      ['door','tool','treat','reload','flash']
       .includes(a.plan[0]?.kind??''),
    fireAllowed:a.firePolicy==='engage'||
      a.firePolicy==='return'&&(a.suppression>=.10||
        s.seconds-a.lastHitAt<=3),
    aiming:target.health>0,activeTarget:target.health>0
  });
  if(!microAllowed)a.aimSideTarget=0;
  else if(s.seconds-(a.lastAimSideProbeAt??-100)>=.16){
    a.lastAimSideProbeAt=s.seconds;
    const aimYaw=angle(a.p,target.p);
    const height=aimHeight(target.posture==='crouch');
    const canFireOffset=(offset:number)=>{
      const probe=weaponClearance({x:a.p.x,z:a.p.y,
        heading:a.heading,weaponYaw:aimYaw,shoulderOffset:offset,
        weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,
        equipment:a.equipment,aim:a.aim,posture:a.posture,
        velocity:a.velocity,recoil:a.recoil,threatRange:d(a.p,target.p)
       },s.doors,world.cover,world.walls,friends);
      if(probe.blocked)return false;
      const origin={x:probe.muzzle.x,y:probe.muzzle.z};
      const far=muzzleEndpoint(origin,probe.muzzle.yaw,
        Math.max(170,d(origin,target.p)+38));
      const farHeight=probe.muzzle.y+(height-probe.muzzle.y)*
        d(origin,far)/Math.max(1,d(origin,target.p));
      // A candidate must clear the actual outgoing barrel direction,
      // including a miss that continues beyond the intended target.
      if(observedCivilianFireLane(s,a,origin,probe.muzzle.y,
        far,farHeight))return false;
      if(assessFriendlyLane(origin,probe.muzzle.y,far,farHeight,
        friends).blocker==='friendly')return false;
      return assessFireLane(origin,probe.muzzle.y,target.p,height,
        world.cover,world.walls,s.doors,friends).blocker==='clear';
    };
    // A centered clear shot needs no contact correction. Otherwise keep
    // an already clear prior accommodation to prevent left-right flutter.
    a.aimSideTarget=canFireOffset(0)?0:
      chooseMicroAimOffset(a.aimSideOffset??0,canFireOffset).offset;
  }
  // The target selector deliberately keeps tracking a lone visible target
  // even if their current firing lane is obstructed. That is correct
  // targeting behavior, but friendly sidestep must run *after* selection,
  // rather than only in the (often unreachable) no-target branch.
  if(a.side==='blue'&&a.velocity<10&&!a.fireRetreatTarget&&friends.length){
    const preflight=weaponClearance({x:a.p.x,z:a.p.y,heading:a.heading,
      weaponYaw:angle(a.p,target.p),shoulderOffset:a.aimSideOffset??0,
      weapon:a.weapon,
      weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,
      aim:a.aim,posture:a.posture,velocity:a.velocity,recoil:a.recoil,
      threatRange:d(a.p,target.p)},s.doors,world.cover,world.walls,
      friends);
    if(preflight.blocked&&preflight.blocker==='friendly'){
      if(requestClearFireStep(s,a,target,'friendly'))return;
    }else if(!preflight.blocked){
      const from={x:preflight.muzzle.x,y:preflight.muzzle.z};
      const targetHeight=aimHeight(target.posture==='crouch');
      const lane=assessFireLane(from,preflight.muzzle.y,
        target.p,targetHeight,world.cover,world.walls,s.doors,friends);
      if(lane.blocker==='friendly'&&!observedCivilianFireLane(
         s,a,from,preflight.muzzle.y,target.p,targetHeight)){
        if(requestClearFireStep(s,a,target,'friendly'))return;
      }
    }
  }
  if(a.targetId!==target.id){
    a.targetId=target.id;
    // Real visual confirmation upgrades an existing LOOK/WATCH posture
    // without discarding its prior readiness. No hidden-intel head start.
    a.aim=contactAimOnAcquisition(a.aim);
    a.stability=Math.min(a.stability,.65);
  }
  // After a real flank hit, orient toward the attack before reacquiring an
  // unrelated old contact. A now-visible hostile in that sector still wins
  // through the normal target selector on the following ticks.
  const hitFacing=a.side==='blue'?
    incomingHitFacing(a.heading,a.lastHitYaw,s.seconds-a.lastHitAt):null;
  if(hitFacing!==null&&s.seconds-a.lastHitAt<.85&&
     Math.abs(angleDifference(hitFacing,angle(a.p,target.p)))>.75){
    a.weaponYaw=approachAngle(a.weaponYaw,hitFacing,dt*profile.turnSpeed*mods.turn);
    return;
  }
  const moving=a.velocity>10;
  const weapon=WEAPONS[a.weapon];
  const range=d(a.p,target.p);
  const acquisition=acquisitionSeconds({
    base:weapon.acquisition,moving,
    skillFactor:2-skillMultiplier(a.skills.handling,.4),
    enemy:a.side==='red',range,attachmentFactor:sightAcquisitionScale(mods,range),
    cautious:a.personality==='cautious'
  });
  const urgency=fireUrgency({confirmed:true,suspicious:false});
  a.aim=Math.min(1,a.aim+dt/
    (acquisition*contactAcquisitionScale(urgency)));
  const desiredYaw=angle(a.p,target.p);
  a.weaponYaw=approachAngle(a.weaponYaw,desiredYaw,dt*profile.turnSpeed*mods.turn*
    (a.suppression>.6?.75:1)*contactTurnScale(urgency));
  if(a.fireCd>0)return;
  // A short-stock remains an *actual* shooting pose when its muzzle points
  // toward a confirmed threat, not just a blocked animation state.
  const muzzle=weaponClearance({
    x:a.p.x,z:a.p.y,heading:a.heading,weaponYaw:a.weaponYaw,
    shoulderOffset:a.aimSideOffset??0,
    weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,
    equipment:a.equipment,aim:a.aim,posture:a.posture,velocity:a.velocity,
    recoil:a.recoil,threatRange:range
  },s.doors,world.cover,world.walls,friends);
  const mode=urgentFireMode(readyMode(range,a.aim,a.weapon),
    a.aim,muzzle,desiredYaw);
  if(!mode){
    if(muzzle.blocked)requestClearFireStep(s,a,target,
      muzzle.blocker==='friendly'?'friendly':'muzzle');
    return;
  }
  if(Math.abs(angleDifference(a.heading,a.weaponYaw))>.87){
    rotate(a,a.weaponYaw,dt,s);return;
  }
  // Do not claim a sighted hit while the barrel is still turning past target.
  if(Math.abs(Math.atan2(Math.sin(desiredYaw-a.weaponYaw),
    Math.cos(desiredYaw-a.weaponYaw)))>.38)return;
  a.fireMode=mode;
  commitShot(s,a,target,{mode,range,moving,mods,weapon,profile});
}

 return {fire,requestClearFireStep};
}
