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
import {incomingHitFacing,chooseMuzzleRecoveryStep,chooseFriendlyLaneStep} from './breach-combat-reactions.ts';

import {type Pt,WALLS,COVER,segmentsCross,pointToSegment} from './breach-core.ts';
import {length,targetAngle,angleDifference} from './breach-plan.ts';
import {WEAPONS} from './breach-combat.ts';
import {aimHeight} from './breach-cover-height.ts';
import {assessFireLane,fireLaneReachable} from './breach-fire-safety.ts';
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
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
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
   other.side===a.side).map(other=>other.p);
 // Recovery must never rely on moving another body to open the lane.
 const people=[
   ...s.operators.filter(other=>other!==a&&other.health>0).map(o=>o.p),
   ...s.civilians.filter(c=>c.health>0).map(c=>c.p)
 ];
 const aimYaw=angle(a.p,target.p),range=d(a.p,target.p);
 const clearBody=(candidate:Pt)=>
   sweptBodyClear(a.p,candidate,s.doors)&&
   people.every(p=>pointToSegment(p,{a:a.p,b:candidate})>=20);
 const legalShot=(candidate:Pt)=>{
   const clearance=weaponClearance({
     x:candidate.x,z:candidate.y,heading:a.heading,weaponYaw:aimYaw,
     weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,
     aim:a.aim,posture:a.posture,velocity:0,recoil:a.recoil,
     threatRange:range
   },s.doors);
   if(clearance.blocked)return false;
   const from={x:clearance.muzzle.x,y:clearance.muzzle.z};
   const height=aimHeight(target.posture==='crouch');
   if(observedCivilianFireLane(s,a,from,clearance.muzzle.y,
     target.p,height))return false;
   return assessFireLane(from,clearance.muzzle.y,target.p,height,
      COVER,WALLS,s.doors,friends).blocker==='clear';
 };
 const next=kind==='friendly'?
   chooseFriendlyLaneStep(a.p,aimYaw,clearBody,legalShot):
   chooseMuzzleRecoveryStep(a.p,aimYaw,clearBody,legalShot);
 if(!next)return false;
 a.fireRetreatTarget=next;
 a.fireRetreatUntil=s.seconds+1.25;
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
    rotate(a,a.weaponYaw,dt);return;
  }
  const spread=dispersion(a.weapon,'ads',a.stability,a.velocity>10,
    a.suppression,a.injuryStage,a.recoil)*.9*
    sightSpreadScale(mods,'ads',d(a.p,point));
  const proposedYaw=shotYaw(a.weaponYaw,spread,random(s),random(s));
  const clearance=weaponClearance({x:a.p.x,z:a.p.y,
    heading:a.heading,weaponYaw:proposedYaw,weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil},s.doors);
  if(clearance.blocked)return;
  const muzzle=clearance.muzzle;
  const yaw=muzzle.yaw;
  const from={x:muzzle.x,y:muzzle.z};
  const far=muzzleEndpoint(from,yaw,Math.max(40,d(from,point)));
  const friends=team(s).filter(o=>o!==a&&o.health>0).map(o=>o.p);
  if(observedCivilianFireLane(s,a,from,muzzle.y,far,14)){
    civilianShotWithheld(s,a);return;
  }
  if(assessFireLane(from,muzzle.y,far,14,COVER,WALLS,s.doors,
    friends).blocker==='friendly')return;
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
    if(WALLS.some(w=>segmentsCross({a:impact.end,b:e.p},w)))continue;
    e.suppression=Math.min(1,e.suppression+.16);
    e.morale=Math.max(0,e.morale-.025);
  }
}
function fire(s:Session,a:TeamActor,dt:number){
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
      a.aim=Math.max(0,a.aim-dt*.35);return;
    }
    if(a.firePolicy==='return'&&a.suppression<.10&&
      s.seconds-a.lastHitAt>3){
      a.aim=Math.max(0,a.aim-dt*.35);return;
    }
    if(a.firePolicy==='suppress'){
      fireSuppression(s,a,dt);return;
    }
  }
  const enemiesOf=a.side==='blue'?enemies(s):team(s);
  const visible=enemiesOf.filter(e=>inSight(a,e,s));
  // Legacy FOCUS saves use ordinary acquisition rather than an
  // inaccessible exclusive lock after FOCUS is removed from the interface.
  const target=selectFireableContact(a.p,visible,a.targetId,candidate=>{
    if(observedCivilianFireLane(s,a,a.p,a.posture==='crouch'?18:26,
       candidate.p,aimHeight(candidate.posture==='crouch'))){
      civilianShotWithheld(s,a);return false;
    }
    const friends=s.operators.filter(other=>other!==a&&other.health>0&&
      other.side===a.side).map(other=>other.p);
    const lane=assessFireLane(a.p,a.posture==='crouch'?18:26,
      candidate.p,aimHeight(candidate.posture==='crouch'),
      COVER,WALLS,s.doors,friends);
    if(lane.blocker==='clear')return true;
    if(lane.blocker!=='cover')return false;
    // Candidate selection uses the SAME physical penetration model as
    // ignition, instead of rejecting every covered contact regardless of
    // caliber. A confirmed contact is still required for acquisition.
    const preview=strikeSurface(a.p,candidate.p,s,
      a.posture==='crouch'?18:26,aimHeight(candidate.posture==='crouch'),
      WEAPONS[a.weapon].penetration);
    return fireLaneReachable(lane,preview,candidate.p);
  });
  if(!target){
    a.targetId=null;a.aim=Math.max(0,a.aim-dt*.6);
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
      },s.doors);
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
  // The target selector deliberately keeps tracking a lone visible target
  // even if their current firing lane is obstructed. That is correct
  // targeting behavior, but friendly sidestep must run *after* selection,
  // rather than only in the (often unreachable) no-target branch.
  if(a.side==='blue'&&a.velocity<10&&!a.fireRetreatTarget){
    const friends=team(s).filter(o=>o!==a&&o.health>0).map(o=>o.p);
    const muzzleHeight=a.posture==='crouch'?18:26;
    const targetHeight=aimHeight(target.posture==='crouch');
    const lane=assessFireLane(a.p,muzzleHeight,target.p,targetHeight,
      COVER,WALLS,s.doors,friends);
    if(lane.blocker==='friendly'&&!observedCivilianFireLane(
       s,a,a.p,muzzleHeight,target.p,targetHeight)){
      if(requestClearFireStep(s,a,target,'friendly'))return;
    }
  }
  if(a.targetId!==target.id){a.targetId=target.id;a.aim=0;
    a.stability=Math.min(a.stability,.65);}
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
    enemy:a.side==='red',attachmentFactor:sightAcquisitionScale(mods,range),
    cautious:a.personality==='cautious'
  });
  a.aim=Math.min(1,a.aim+dt/acquisition);
  const desiredYaw=angle(a.p,target.p);
  a.weaponYaw=approachAngle(a.weaponYaw,desiredYaw,dt*profile.turnSpeed*mods.turn*
    (a.suppression>.6?.75:1));
  const mode=readyMode(range,a.aim,a.weapon);
  if(!mode||a.fireCd>0)return;
  if(Math.abs(angleDifference(a.heading,a.weaponYaw))>.87){
    rotate(a,a.weaponYaw,dt);return;
  }
  // Do not claim a sighted hit while the barrel is still turning past target.
  if(Math.abs(Math.atan2(Math.sin(desiredYaw-a.weaponYaw),
    Math.cos(desiredYaw-a.weaponYaw)))>.38)return;
  a.fireMode=mode;
  commitShot(s,a,target,{mode,range,moving,mods,weapon,profile});
}

 return {fire,requestClearFireStep};
}
