/** Roadmap 2 / Stage 10 — unified authoritative firing & damage pipeline.
 * Extraction preserves original 60 Hz call order, seeded RNG draws, shot
 * identity, ammunition, civilian safety, penetration and replay evidence.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {BattleEvent} from './breach-combat.ts';
import {rotate} from './breach-order-lifecycle.ts';
import {segmentImpact,strikeSurface} from './breach-ballistic-resolution.ts';
import {incomingHitFacing,chooseMuzzleRecoveryStep,chooseFriendlyLaneStep} from './breach-combat-reactions.ts';
import {shotPressureAtActor,shotPressureAmount} from './breach-shot-pressure.ts';
import {type Pt,WALLS,COVER,segmentsCross,doorCenter,pointToSegment} from './breach-core.ts';
import {length,targetAngle,angleDifference} from './breach-plan.ts';
import {WEAPONS,injuryOf,woundSeverity,nearCover} from './breach-combat.ts';
import {aimHeight} from './breach-cover-height.ts';
import {assessFireLane,fireLaneReachable} from './breach-fire-safety.ts';
import {selectFireableContact} from './breach-target-selection.ts';
import {acquisitionSeconds} from './breach-firing-cadence.ts';
import {type MaterialId} from './breach-materials.ts';
import {damageCover} from './breach-reactive-cover.ts';
import {materialResponse} from './breach-impact-responses.ts';
import {damageWindow,windowPaneSegment} from './breach-windows.ts';
import {type CivilianActor} from './breach-civilian-types.ts';
import {firstCivilianAlongRay,applyCivilianBulletHit} from './breach-civilian-ballistics.ts';
import {knownCivilianInFireLane} from './breach-civilian-fire-safety.ts';
import {recordCivilianHarm} from './breach-civilian-harm.ts';
import {contactTactic} from './breach-ai-tactical-response.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {weaponHandlingModifiers,sightAcquisitionScale,sightSpreadScale} from './equipment-weapon-handling.ts';
import {skillMultiplier} from './breach-skills.ts';
import {BALLISTICS,approachAngle,readyMode,dispersion,shotYaw,rayHitsActor,muzzleEndpoint,recoverWeapon} from './breach-ballistics.ts';
import {shotDispersionCone} from './breach-shot-ignition.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {resolveArmorImpact} from './equipment-armor.ts';
import {retainImpactMark} from './breach-impact-evidence-buffer.ts';
import {CASING_LIMIT} from './breach-effects.ts';
import {wallSafeFall} from './breach-ground-geometry.ts';
import {chooseFall,hitRegion} from './breach-wounds.ts';
import {registerWound} from './breach-medical-wounds.ts';

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
/** Distinct pre-target penetration events leave physical evidence. */
function emitMaterialEvents(s:Session,from:Pt,to:Pt,
 hits:readonly {fraction:number;material:MaterialId}[],
 maximum=1){
 const unique=new Set<string>();
 for(const hit of hits){
  if(hit.fraction>maximum+.00001||hit.fraction>=.9999)continue;
  const p={x:from.x+(to.x-from.x)*hit.fraction,
    y:from.y+(to.y-from.y)*hit.fraction};
  const key=Math.round(p.x/3)+','+Math.round(p.y/3);
  if(unique.has(key))continue;unique.add(key);
  const response=materialResponse(hit.material);
  retainImpactMark(s,{id:s.nextEffectId++,p,
    surface:response.visual,age:0,height:20});
  if(response.sound!=='glass')
    hear(s,p,response.radius,'impact-'+response.sound);
 }

}
/** Mutate only struck cover, never the planning ray or visual renderer. */
function damageStruckCover(s:Session,hits:readonly {index:number;fraction:number}[],
 force:number,maxFraction=1){
 const touched=new Set<number>();
 for(const h of hits){
  if(h.fraction>maxFraction+.00001||touched.has(h.index))continue;
  touched.add(h.index);
  const piece=s.coverState[h.index];if(!piece)continue;
  const result=damageCover(piece,force);
  if(result==='immune')continue;
  s.objectRevision++;
  if(result==='collapsed'){
    battleEvent(s,'impact',null,{x:piece.x,y:piece.y},
      (piece.fixture??'FURNITURE').toUpperCase()+' COLLAPSED');
    // Nearby defenders perceive their own cover crumbling. Uninformed
    // distant guards are not globally told the new geometry.
    for(const defender of enemies(s)){
      if(defender.health<=0)continue;
      const near=d(defender.p,{x:piece.x,y:piece.y})<
        Math.max(piece.w,piece.h)+34;
      if(near){
        defender.defense=null;defender.defenseUntil=s.seconds;
        defender.nav=[];defender.suppression=Math.min(1,
          defender.suppression+.12);
      }
    }
  }
 }
 if(touched.size)COVER.splice(0,COVER.length,...s.coverState);
}
/** Persist actual glass-door damage only after a fired projectile. The metal
 * frame and physical leaf remain operational; only glazing shatters. */
function shatterStruckDoorGlass(s:Session,
 hits:readonly {index:number;fraction:number}[],maxFraction=1){
 for(const hit of hits){
  if(hit.fraction>maxFraction+.00001)continue;
  const door=s.doors[hit.index];
  if(!door||door.glassShattered||
     !['glazed','french'].includes(door.style??''))continue;
  door.glassShattered=true;s.objectRevision++;
  const at=doorCenter(door);
  hear(s,at,175,'glass');
  battleEvent(s,'impact',null,at,'GLASS DOOR SHATTERED');
 }
}
/** Keep decorative evidence bounded separately from authoritative hits.
 * Nearby blood spatters merge rather than creating dozens of overlapping
 * translucent meshes during sustained automatic fire. */
/** Commit impacts only for the actual shot path, never aim/LOS queries. */
function shatterStruckWindows(s:Session,paneHits:readonly number[],force:number){
 for(const index of new Set(paneHits)){
  const window=s.windows[index];
  if(!window||!damageWindow(window,force))continue;
  s.objectRevision++;
  hear(s,{x:window.x,y:window.y},170,'glass');
  if(window.shattered&&window.shatteredAt===undefined)
    window.shatteredAt=s.seconds;
  if(window.shattered)battleEvent(s,'impact',null,
    {x:window.x,y:window.y},'GLASS SHATTERED');
 }
}
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
  // The eyes may have a contact even when the muzzle cannot safely fire.
  // Hold the shot rather than dumping ammunition into adjacent cover or
  // risking a friendly operator standing in the near firing corridor.
  const sightClearance=weaponClearance({x:a.p.x,z:a.p.y,heading:a.heading,
    weaponYaw:a.weaponYaw,weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil,threatRange:range},s.doors);
  if(sightClearance.blocked){
    a.lastFireBlock=sightClearance.blocker;
    if(sightClearance.blocker==='wall'||sightClearance.blocker==='cover')
      requestClearFireStep(s,a,target,'muzzle');
    return;
  }
  const sightMuzzle=sightClearance.muzzle;
  const friends=s.operators.filter(o=>o!==a&&o.health>0&&
    o.side===a.side).map(o=>o.p);
  if(observedCivilianFireLane(s,a,
     {x:sightMuzzle.x,y:sightMuzzle.z},sightMuzzle.y,
     target.p,aimHeight(target.posture==='crouch'))){
    civilianShotWithheld(s,a);return;
  }
  const lane=assessFireLane({x:sightMuzzle.x,y:sightMuzzle.z},
    sightMuzzle.y,target.p,aimHeight(target.posture==='crouch'),
    COVER,WALLS,s.doors,friends);
  a.lastFireBlock=lane.blocker;
  if(lane.blocker==='friendly'){
    requestClearFireStep(s,a,target,'friendly');
    return; // never force a shot through an allied body
  }
  const laneTrace=strikeSurface(
    {x:sightMuzzle.x,y:sightMuzzle.z},target.p,s,
    sightMuzzle.y,aimHeight(target.posture==='crouch'),
    weapon.penetration);
  if(!fireLaneReachable(lane,laneTrace,target.p)){
    if(a.side==='blue'&&s.seconds-a.lastLaneWarnAt>2){
      notify(s,a.name+' FIRE BLOCKED · '+lane.blocker.toUpperCase());
      a.lastLaneWarnAt=s.seconds;
    }
    return;
  }
  const priorBurst=s.seconds-a.lastShotAt<.48;
  const proposedBurst=priorBurst?a.burstCount+1:1;
  // Roll ordering is authoritative. The pure ignition policy never calls RNG.
  const cone=shotDispersionCone(a,mode,range,moving,mods,weapon.optimalRange);
  const proposedYaw=shotYaw(a.weaponYaw,cone,random(s),random(s));
  const shotClearance=weaponClearance({x:a.p.x,z:a.p.y,heading:a.heading,
    weaponYaw:proposedYaw,weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil,threatRange:range},s.doors);
  if(shotClearance.blocked){
    a.lastFireBlock=shotClearance.blocker;return;
  }
  const muzzle=shotClearance.muzzle;
  const yaw=muzzle.yaw; // fire exactly along the physically cleared barrel
  const muzzlePoint={x:muzzle.x,y:muzzle.z};
  // Spread may put another teammate in the actual bullet corridor.
  const shotTarget=muzzleEndpoint(muzzlePoint,yaw,
    Math.max(1,d(muzzlePoint,target.p)));
  if(observedCivilianFireLane(s,a,muzzlePoint,muzzle.y,
     shotTarget,aimHeight(target.posture==='crouch'))){
    civilianShotWithheld(s,a);return;
  }
  const shotLane=assessFireLane(muzzlePoint,muzzle.y,
    shotTarget,aimHeight(target.posture==='crouch'),
    COVER,WALLS,s.doors,friends);
  if(shotLane.blocker==='friendly'){
    a.lastFireBlock='friendly';return;
  }
  const muzzleReach=strikeSurface(a.p,muzzlePoint,s,
    muzzle.y,muzzle.y);
  if(d(a.p,muzzleReach.end)+.7<d(a.p,muzzlePoint)){
    a.aim=Math.min(a.aim,.82);return;
  }
  a.weaponYaw=yaw; // renderer sees exactly the outgoing shot orientation
  a.fireCd=weapon.interval*(a.side==='red'?1.30:1);
  a.magazine--;a.shots++;a.burstCount=proposedBurst;
   if(mode==='point')a.pointShots++;else a.aimedShots++;
  a.lastShotAt=s.seconds;
  const hitRadius=Math.max(4.2,10.5-
    (target.posture==='crouch'?1.7:0)-
    (nearCover(target.p,a.p)?2:0));
  const candidateHit=rayHitsActor(muzzlePoint,yaw,target.p,hitRadius);
  const muzzleRange=d(muzzlePoint,target.p);
  const far=muzzleEndpoint(muzzlePoint,yaw,Math.max(muzzleRange+38,170));
  // Aim for the target's visible upper body, not an imaginary ground-level
  // hitpoint. At close range this clears waist-high cover naturally.
  const strikeHeight=muzzle.y+(aimHeight(target.posture==='crouch')-
    muzzle.y)*d(muzzlePoint,far)/Math.max(1,muzzleRange);
  const strike=strikeSurface(muzzlePoint,far,s,muzzle.y,strikeHeight,
    weapon.penetration);
  const targetTrace=strikeSurface(muzzlePoint,target.p,s,muzzle.y,
    aimHeight(target.posture==='crouch'),weapon.penetration);
  // Obstruction before the target defeats a perfectly aligned barrel.
  const blockerDist=d(muzzlePoint,strike.end);
  const wouldHitTarget=candidateHit&&blockerDist>=muzzleRange-hitRadius&&
    d(targetTrace.end,target.p)<.5&&targetTrace.remaining>.015;
  // Only after firing do physical ray/body tests consider a civilian.
  // This cannot grant pre-shot target acquisition or hidden knowledge.
  const contact=firstCivilianAlongRay(muzzlePoint,yaw,
    Math.min(d(muzzlePoint,far),blockerDist),s.civilians,{
      muzzleHeight:muzzle.y,farHeight:strikeHeight,
      farDistance:d(muzzlePoint,far)
    });
  const civilianHit=contact&&(!wouldHitTarget||
    contact.along+5<muzzleRange)?contact:null;
  const hit=wouldHitTarget&&!civilianHit;
  const fractionToTarget=d(muzzlePoint,target.p)/
    Math.max(1,d(muzzlePoint,far));
  const stopFraction=civilianHit?
    civilianHit.along/Math.max(1,d(muzzlePoint,far)):
    hit?fractionToTarget:1;
  const actualRay=strike.paneHits.filter(index=>{
    const w=s.windows[index];
    if(!w)return false;
    const t=segmentImpact(muzzlePoint,far,windowPaneSegment(w));
    return t!==null&&t<=stopFraction+.0001;
  });
  shatterStruckWindows(s,actualRay,Math.max(1,weapon.damage));
  shatterStruckDoorGlass(s,strike.glassDoorHits,stopFraction);
  damageStruckCover(s,strike.coverHits,weapon.damage*.45,stopFraction);
  emitMaterialEvents(s,muzzlePoint,far,strike.materialHits,stopFraction);
  const end=civilianHit?clone(civilianHit.actor.p):
    hit?clone(target.p):strike.end;
  a.recoil=Math.min(.9,a.recoil+profile.recoilKick*mods.recoilKick*
    (a.burstCount>2?1.20:1)*
    (2-skillMultiplier(a.skills.recoilControl,.42)));
  a.stability=Math.max(0,a.stability-
    (mode==='point'?.23:.16)*
    (2-skillMultiplier(a.skills.composure,.38))-a.recoil*.10);
  const shotId=s.nextShotId++;
  const region=hitRegion(shotId);
  const healthBefore=civilianHit?civilianHit.actor.health:target.health;
  const rawSeverity=hit&&s.site?woundSeverity(weapon,range,
    nearCover(target.p,a.p),random(s)):1;
  const protection=resolveArmorImpact({kit:target.equipment,region,
    incomingYaw:yaw,targetHeading:target.heading,
    penetration:weapon.penetration,severity:rawSeverity,
    shotId,torso:target.armorIntegrity,head:target.helmetIntegrity});
  const severity=protection.severity;
  const nextStage=Math.min(3,target.injuryStage+(hit?severity:0));
  const healthAfter=civilianHit?Math.max(0,healthBefore-1):
    hit?(s.site?nextStage>=3?0:4-nextStage:Math.max(0,healthBefore-1)):
    healthBefore;
  const impact=civilianHit?{end,surface:'blood' as const}:
    hit?{end,surface:protection.blocked&&severity===0?
      'metal' as const:'blood' as const}:strike;
  s.sparks.push({p:clone(a.p),side:a.side,age:0});
  // Immutable shot identity lets 2D/3D attach recoil and damage effects to
  // the correct actors without guessing from proximity or team color.
  const impactHeight=civilianHit?20:
    hit?aimHeight(target.posture==='crouch'):
    impact.surface==='dust'?1:14;
  retainImpactMark(s,{id:s.nextEffectId++,p:clone(end),
    surface:impact.surface,height:impactHeight,age:0});

  const nearSolid=COVER.some(c=>!c.low&&
    Math.abs(target.p.x-c.x)<=c.w/2+12&&
    Math.abs(target.p.y-c.y)<=c.h/2+12);
  const nearWall=WALLS.some(w=>{
    const vx=w.b.x-w.a.x,vy=w.b.y-w.a.y;
    const denominator=Math.max(1e-6,vx*vx+vy*vy);
    const t=clamp(((target.p.x-w.a.x)*vx+
      (target.p.y-w.a.y)*vy)/denominator,0,1);
    return d(target.p,{x:w.a.x+vx*t,y:w.a.y+vy*t})<12;
  });
  const fall=wallSafeFall(target.p,target.heading,
    chooseFall(target.heading,yaw,nearSolid||nearWall),WALLS);
  s.shots.push({
    id:shotId,shooterId:a.id,
    targetId:civilianHit?.actor.id??target.id,
    start:muzzlePoint,end,age:0,hit:hit||!!civilianHit,side:a.side,
    shotYaw:yaw,mode,spread:cone,
    muzzleHeight:muzzle.y,firedAt:s.seconds,impactHeight,
    hitRegion:civilianHit?'torso':hit?region:undefined,
    downPose:hit&&healthAfter<=0?fall.pose:undefined,
    healthBefore,healthAfter,
    down:(hit||!!civilianHit)&&healthAfter<=0,
    surface:impact.surface,
  });
  s.casings.push({id:shotId,at:s.seconds,weapon:a.weapon,side:a.side,
    x:muzzle.x-4*Math.cos(a.weaponYaw),z:muzzle.z-4*Math.sin(a.weaponYaw),
    y:muzzle.y-3,heading:a.weaponYaw});
  if(s.casings.length>CASING_LIMIT)s.casings.shift();
  hear(s,a.p,weapon.noise*mods.noise,'gunshot');
  battleEvent(s,'shot',a,a.p,a.name+' FIRED '+weapon.label);
  // A shot heard behind the team suggests an imprecise location.
  // A sound NEVER exposes the exact shooter through a wall.
  if(a.side==='red'&&!isSeen(s,a)&&
     team(s).some(observer=>observer.health>0&&d(observer.p,a.p)<380)){
    s.known.set(a.id,{p:{
      x:a.p.x+(random(s)-.5)*58,y:a.p.y+(random(s)-.5)*58,
    },at:s.seconds,status:'heard'});
    notify(s,'UNSEEN GUNFIRE');
  }
  if(civilianHit){
    const harm=applyCivilianBulletHit(civilianHit.actor,s.seconds);
    recordCivilianHarm(s.civilianHarmEvents,{
      id:shotId,shotId,at:s.seconds,victimId:civilianHit.actor.id,
      actorId:a.id,sourceSide:a.side,before:harm.before,
      after:harm.after,severity:harm.down?'incapacitated':'injured',
      p:clone(civilianHit.actor.p)
    });
    // Casualty is NOT a hostile kill or accuracy bonus, and hidden
    // civilians do not generate a revealing live contact notification.
    if(liveVisibility(s,civilianHit.actor.p))
      notify(s,'CIVILIAN HIT');
    return;
  }
  // Only a real hit or a physically near projectile/impact can pressure
  // this actor. Aim intent is not evidence: a distant miss must not
  // suppress a target merely because it was selected for acquisition.
  // Solid walls and opaque closed doors occlude the near-miss evidence;
  // material cover is excluded here because a nearby cover strike is an
  // actual, locally experienced impact. Explicit SUPPRESS uses its own
  // area-impact rules above and is not added a second time here.
  const exposure=shotPressureAtActor(muzzlePoint,end,target.p,hit,
    (from,to)=>assessFireLane(from,muzzle.y,to,
      aimHeight(target.posture==='crouch'),[],WALLS,s.doors).blocker==='clear');
  target.suppression=Math.min(1,target.suppression+
    shotPressureAmount(exposure));
  if(target.side==='red')target.morale=Math.max(0,target.morale-.035);
  if(hit){
    target.armorIntegrity=protection.torso;
    target.helmetIntegrity=protection.head;
    target.health=healthAfter;
    target.injuryStage=s.site?nextStage:Math.min(3,target.injuryStage+1);
    if(severity>0)registerWound(target.medical,shotId,region,severity,s.seconds);
    target.lastHitAt=s.seconds;
    // Incoming fire physically interrupts aim and the current weapon.
    target.stability=Math.max(0,target.stability-.22*severity);
    target.recoil=Math.min(.9,target.recoil+.07*severity);
    target.weaponYaw+=Math.sin(yaw-target.heading)*.045*severity;
    target.lastHitRegion=region;target.lastHitYaw=yaw;
    target.lastHitSeverity=severity;
    if(target.side==='red')target.morale=Math.max(0,
      target.morale-.18*severity);
    battleEvent(s,healthAfter<=0?'down':severity===0?'impact':'wound',target,target.p,
      target.name+' '+(severity===0?'ARMOR STOPPED HIT':
        injuryOf(target.injuryStage).toUpperCase()));
    a.hits++;
    if(range>weapon.optimalRange)a.longHits++;
    if(target.health<=0){
      a.kills++;s.deaths++;target.lastDownAt=s.seconds;
      target.downPose=fall.pose;target.downClearance=fall.space;
      target.plan=[];target.path=[];
      target.nav=[];target.velocity=0;
      notify(s,target.name+' DOWN');
      for(const ally of enemies(s))if(ally!==target&&ally.health>0&&
        d(ally.p,target.p)<145)ally.morale=Math.max(0,ally.morale-.13);
    }else notify(s,target.name+' '+injuryOf(target.injuryStage).toUpperCase());
  }
}

 return {fire,requestClearFireStep};
}
