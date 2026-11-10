import {sessionWorldGeometry} from './breach-world-context.ts';
/** Roadmap 2 / Stage 10: authoritative confirmed-target shot resolution.
 * Called only after live acquisition and ready-mode eligibility. Retains the
 * identical physical muzzle, safety tests, RNG ordering and casualty effects.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {Pt} from './breach-core.ts';
import {WEAPONS} from './breach-combat.ts';
import {BALLISTICS,readyMode} from './breach-ballistics.ts';
import {weaponHandlingModifiers} from './equipment-weapon-handling.ts';
import type {createShotEnvironmentCommitter} from './breach-shot-environment.ts';
import {segmentImpact,strikeSurface} from './breach-ballistic-resolution.ts';
import {shotPressureAtActor,shotPressureAmount} from './breach-shot-pressure.ts';
import {length} from './breach-plan.ts';
import {injuryOf,woundSeverity,nearCover} from './breach-combat.ts';
import {aimHeight} from './breach-cover-height.ts';
import {assessFireLane,fireLaneReachable} from './breach-fire-safety.ts';
import {windowPaneSegment} from './breach-windows.ts';
import {firstCivilianAlongRay,applyCivilianBulletHit} from './breach-civilian-ballistics.ts';
import {recordCivilianHarm} from './breach-civilian-harm.ts';
import {skillMultiplier} from './breach-skills.ts';
import {shotYaw,rayHitsActor,muzzleEndpoint} from './breach-ballistics.ts';
import {shotDispersionCone} from './breach-shot-ignition.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {resolveArmorImpact} from './equipment-armor.ts';
import {retainImpactMark} from './breach-impact-evidence-buffer.ts';
import {CASING_LIMIT} from './breach-effects.ts';
import {wallSafeFall} from './breach-ground-geometry.ts';
import {chooseFall,hitRegion} from './breach-wounds.ts';
import {registerWound} from './breach-medical-wounds.ts';

export type ShotCommitContext={
 mode:NonNullable<ReturnType<typeof readyMode>>;
 range:number;
 moving:boolean;
 mods:ReturnType<typeof weaponHandlingModifiers>;
 weapon:(typeof WEAPONS)[keyof typeof WEAPONS];
 profile:(typeof BALLISTICS)[keyof typeof BALLISTICS];
};
export type ShotResolverPorts=ReturnType<typeof createShotEnvironmentCommitter> & {
 team:(s:Session)=>TeamActor[];
 enemies:(s:Session)=>TeamActor[];
 isSeen:(s:Session,a:TeamActor)=>boolean;
 liveVisibility:(s:Session,p:Pt)=>boolean;
 hear:(s:Session,p:Pt,radius:number,kind:string)=>void;
 notify:(s:Session,message:string)=>void;
 battleEvent:(s:Session,kind:BattleEvent['kind'],a:TeamActor|null,p:Pt,message:string)=>void;
 random:(s:Session)=>number;
 observedCivilianFireLane:(s:Session,a:TeamActor,from:Pt,
  muzzleHeight:number,to:Pt,targetHeight:number)=>CivilianActor|null;
 civilianShotWithheld:(s:Session,a:TeamActor)=>void;
 requestClearFireStep:(s:Session,a:TeamActor,target:TeamActor,
  kind:'muzzle'|'friendly')=>boolean;
};
const d=(a:Pt,b:Pt)=>length(a,b);
const clone=(p:Pt):Pt=>({...p});
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

export function createShotResolver(ports:ShotResolverPorts){
 const {team,enemies,isSeen,liveVisibility,hear,notify,battleEvent,random,
  observedCivilianFireLane,civilianShotWithheld,requestClearFireStep,
  emitMaterialEvents,damageStruckCover,shatterStruckDoorGlass,
  shatterStruckWindows}=ports;
 function commitShot(s:Session,a:TeamActor,target:TeamActor,
  ctx:ShotCommitContext):void{
  const {mode,range,moving,mods,weapon,profile}=ctx;
  const {walls:WALLS,cover:COVER}=sessionWorldGeometry(s);
  // The eyes may have a contact even when the muzzle cannot safely fire.
  // Hold the shot rather than dumping ammunition into adjacent cover or
  // risking a friendly operator standing in the near firing corridor.
  const sightClearance=weaponClearance({x:a.p.x,z:a.p.y,heading:a.heading,
    weaponYaw:a.weaponYaw,weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil,threatRange:range},s.doors,sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls);
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
    velocity:a.velocity,recoil:a.recoil,threatRange:range},s.doors,sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls);
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
    (nearCover(target.p,a.p,COVER)?2:0));
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
 return {commitShot};
}
