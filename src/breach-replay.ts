/** Build 090–091: deterministic mission film, independent of the live motor.
 * We capture authoritative simulation outcomes at 20 Hz and never re-simulate
 * past actions. Rewind, scrubbing and speed changes cannot alter an outcome.
 */
import {liveVisibility,type Session,type TeamActor,type ShotEvent,type DroppedMagazine,type FlashGrenade,type FlashBurst,type ImpactMark} from './breach-game.ts';
import {COVER,type Door,type Pt} from './breach-core.ts';
import {intelSnapshot,intelRestore} from './breach-intel.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {ExecutionEvent} from './breach-execution-events.ts';
import {copyMedicalCondition,newMedicalCondition} from './breach-medical-wounds.ts';
import {normalizedMedicalSupplies,kitMedicalSupplies} from './equipment-medical-supplies.ts';
import {ReplayMotionRecorder,type ReplayPresentation} from './breach-replay-motion.ts';
import {ReplayPlanRecorder} from './breach-replay-plans.ts';
import {ReplayBallisticsRecorder} from './breach-replay-ballistics.ts';
import {captureReplayManifest,type ReplayManifest} from './breach-replay-manifest.ts';
import {copyNodes,type PlanNode} from './breach-plan.ts';
import {captureReplayKnowledge,applyReplayKnowledge,type ReplayKnowledge}
  from './breach-replay-visibility.ts';
import {enablePersonalGroundCapture,drainPersonalGround,
  type PersonalGroundBatch} from './breach-replay-personal-ground.ts';
import {ReplayDoorObservationRecorder}
  from './breach-replay-door-knowledge.ts';
import {ReplayWindowObservationRecorder}
  from './breach-replay-window-knowledge.ts';
import {shareUnchangedReplayFrame,type ReplaySharingStats}
  from './breach-replay-sharing.ts';
import type {TraverseOpportunity} from './breach-mantle.ts';
import type {CivilianHarmEvent} from './breach-civilian-harm.ts';
import {createCivilian,type CivilianActor} from './breach-civilian-types.ts';

export type ActorFrame=Pick<TeamActor,
  'id'|'p'|'heading'|'health'|'velocity'|'turning'|'posture'|'pace'|'alert'|
  'magazine'|'reserve'|'reload'|'shots'|'fireCd'|'aim'|
  'insertedMagazineId'|'spareMagazines'|'reloadMode'|'reloadStartedAt'|
  'reloadDuration'|'reloadRemoved'|'reloadInserted'|
  'reloadFromRounds'|'reloadTargetRounds'|'reloadSelectedMagazineId'|
  'lastHitAt'|'lastDownAt'|'lastHitRegion'|'lastHitYaw'|
  'lastHitSeverity'|'downPose'|'flashUntil'|'suppression'|
  'wedgeRemaining'|'carryingId'|'carriedById'|
  'lastTreatmentAt'|'lastTreatmentTargetId'|'treatmentActive'|'treatmentProgress'|
  'medical'|'medicalSupplies'|'weapon'|'weaponConfiguration'|'weaponLightOn'|'injuryStage'|'armorIntegrity'|'helmetIntegrity'|'flashCharges'|'morale'|'surrendered'|'defense'|'watch'|'aimInstruction'|
  'lastThrowAt'|'lastDoorAt'|'lastDoorId'|'lastDoorMethod'|'stride'|
  'weaponYaw'|'stability'|'recoil'|'lastShotAt'|'fireMode'|'burstCount'|'skills'|
  'squeeze'|'squeezeYaw'|'squeezeTime'|
  'traversal'|'traversalElapsed'|'traversalElevation'|
  'traversalRetreating'>;
export type ReplayActorFrame=ActorFrame & {
 travelYaw?:number;intentKind?:string;awarenessCount?:number;
 /** Authored remaining orders at this historical sample. */
 plan?:PlanNode[];
};
/** Immutable neutral film sample. Missing on old saved films. */
export type CivilianFrame=Pick<CivilianActor,
  'id'|'p'|'heading'|'health'|'injuryStage'|'state'|'velocity'|
  'lastHitAt'|'following'|'rescueTarget'|'appearanceSeed'|
  'role'|'persona'|'activity'|'homeRoomId'> & {
    /** A recorded operator observation, never future knowledge. */
    carriedById?:string|null;
    transportMode?:CivilianActor['transportMode'];
    visibleAtCapture?:boolean;
  };
export type ReplayFrame={
  /** Presentation data is sampled on demand, never written to snapshots. */
  presentation?:ReplayPresentation;
  t:number;phase:Session['phase'];mission:Session['mission'];
  actors:ReplayActorFrame[];doors:Door[];shots:ShotEvent[];
  /** Optional for compatibility with all pre-civilian recordings. */
  civilians?:CivilianFrame[];
  civilianHarmEvents?:CivilianHarmEvent[];
  objectRevision:number;windows:Session['windows'];coverState:Session['coverState'];
  casings:Session['casings'];
  dropped:DroppedMagazine[];impactMarks:ImpactMark[];grenades:FlashGrenade[];
  flashBursts:FlashBurst[];flashRemaining:number;
  missionType:Session['missionType'];holdTime:number;
  rescue:{p:Pt;following:string|null}|null;objective:Pt;
  seenGround:string[];intel:ReturnType<typeof intelSnapshot>;
  known:[string,{p:Pt;at:number;status:'seen'|'heard'}][];
  /** Optional for pre-R2 recordings. Historical sightings are authoritative. */
  knowledge?:ReplayKnowledge;
};
const position=(p:Pt):Pt=>({x:p.x,y:p.y});
const traversalCopy=(op:TraverseOpportunity|null):TraverseOpportunity|null=>
 op?{...op,from:position(op.from),approach:position(op.approach),
    landing:position(op.landing),destination:position(op.destination)}:null;
const shotCopy=(shot:ShotEvent):ShotEvent=>({...shot,
  start:position(shot.start),end:position(shot.end)});
export function snapshot(s:Session,seenGround?:string[],
  unchangedWorld?:Pick<ReplayFrame,'windows'|'coverState'>,
  previouslyDiscovered:ReadonlySet<string>=new Set(),
  observerBodies:Map<string,Set<string>>=new Map()):ReplayFrame{
  return {
    t:s.seconds,phase:s.phase,mission:s.mission,
    actors:s.operators.map(a=>({id:a.id,p:position(a.p),
      plan:copyNodes(a.plan),
      heading:a.heading,health:a.health,velocity:a.velocity,
      squeeze:a.squeeze,squeezeYaw:a.squeezeYaw,squeezeTime:a.squeezeTime,
      traversal:traversalCopy(a.traversal),
      traversalElapsed:a.traversalElapsed,
      traversalElevation:a.traversalElevation,
      traversalRetreating:a.traversalRetreating,
      turning:a.turning,posture:a.posture,pace:a.pace,alert:a.alert,
      magazine:a.magazine,reserve:a.reserve,reload:a.reload,
      insertedMagazineId:a.insertedMagazineId,
      spareMagazines:a.spareMagazines.map(m=>({...m})),
      reloadMode:a.reloadMode,reloadStartedAt:a.reloadStartedAt,
      reloadDuration:a.reloadDuration,
      reloadRemoved:a.reloadRemoved,reloadInserted:a.reloadInserted,
      reloadFromRounds:a.reloadFromRounds,
      reloadTargetRounds:a.reloadTargetRounds,
      reloadSelectedMagazineId:a.reloadSelectedMagazineId,
      shots:a.shots,fireCd:a.fireCd,aim:a.aim,
      lastHitAt:a.lastHitAt,lastDownAt:a.lastDownAt,
      lastHitRegion:a.lastHitRegion,lastHitYaw:a.lastHitYaw,
      lastHitSeverity:a.lastHitSeverity,downPose:a.downPose,
      flashUntil:a.flashUntil,suppression:a.suppression,
      weapon:a.weapon,weaponConfiguration:a.weaponConfiguration?
        {version:1,weapon:a.weaponConfiguration.weapon,
          slots:{...a.weaponConfiguration.slots}}:undefined,
       injuryStage:a.injuryStage,medical:copyMedicalCondition(a.medical),
       medicalSupplies:{...a.medicalSupplies},
       lastTreatmentAt:a.lastTreatmentAt,
       lastTreatmentTargetId:a.lastTreatmentTargetId,
       treatmentActive:a.treatmentActive,treatmentProgress:a.treatmentProgress,
       carryingId:a.carryingId,carriedById:a.carriedById,
       wedgeRemaining:a.wedgeRemaining,
       weaponLightOn:a.weaponLightOn,
      armorIntegrity:a.armorIntegrity,helmetIntegrity:a.helmetIntegrity,
      flashCharges:a.flashCharges,
      morale:a.morale,
      lastThrowAt:a.lastThrowAt,lastDoorAt:a.lastDoorAt,
      lastDoorId:a.lastDoorId,lastDoorMethod:a.lastDoorMethod,
      stride:a.stride,
      weaponYaw:a.weaponYaw,stability:a.stability,recoil:a.recoil,
      lastShotAt:a.lastShotAt,fireMode:a.fireMode,burstCount:a.burstCount,
      skills:{...a.skills},
      surrendered:a.surrendered,defense:a.defense?position(a.defense):null,
      watch:a.watch?position(a.watch):null,
      aimInstruction:a.aimInstruction?{...a.aimInstruction,
        point:a.aimInstruction.point?position(a.aimInstruction.point):undefined}:null,
      intentKind:a.intent?.kind,awarenessCount:Object.keys(a.awareness.contacts).length})),
    civilianHarmEvents:s.civilianHarmEvents.map(e=>({
      ...e,p:position(e.p)
    })),
    civilians:s.civilians.map(c=>({
      id:c.id,p:position(c.p),heading:c.heading,health:c.health,
      injuryStage:c.injuryStage,state:c.state,velocity:c.velocity,
      lastHitAt:c.lastHitAt,following:c.following,
      carriedById:c.carriedById,transportMode:c.transportMode,
      rescueTarget:c.rescueTarget,appearanceSeed:c.appearanceSeed,
      role:c.role,persona:c.persona,activity:c.activity,
      homeRoomId:c.homeRoomId,
      visibleAtCapture:liveVisibility(s,c.p)
    })),
    doors:s.doors.map(d=>({...d,a:position(d.a),b:position(d.b)})),
    objectRevision:s.objectRevision,
    // Replay already shares these immutable samples until objectRevision moves.
    // Avoid allocating copies just to throw them away in capture().
    windows:unchangedWorld?.windows??s.windows.map(w=>({...w})),
    coverState:unchangedWorld?.coverState??s.coverState.map(o=>({...o})),
    shots:s.shots.map(shotCopy),
    casings:s.casings.map(x=>({...x})),
    dropped:s.dropped.map(m=>({...m,p:position(m.p)})),
    impactMarks:s.impactMarks.map(m=>({...m,p:position(m.p)})),
    grenades:s.grenades.map(g=>({...g,p:position(g.p),
      from:position(g.from),to:position(g.to)})),
    flashBursts:s.flashBursts.map(b=>({...b,p:position(b.p)})),
    flashRemaining:s.flashRemaining,
    missionType:s.missionType,holdTime:s.holdTime,
    rescue:s.rescue?{p:position(s.rescue.p),following:s.rescue.following}:null,
    objective:position(s.scenario.objective),
    seenGround:seenGround??[...s.seenGround],intel:intelSnapshot(s.intel),
    known:[...s.known].map(([id,c])=>[id,
      {p:position(c.p),at:c.at,status:c.status}]),
    knowledge:captureReplayKnowledge(s,previouslyDiscovered,observerBodies),
  };
}
export class MissionRecorder{
  readonly frames:ReplayFrame[]=[];
  readonly events:BattleEvent[]=[];
  readonly executionEvents:ExecutionEvent[]=[];
  /** Sparse personal ground reveals, captured at the actual sight tick.
   * Kept outside the 20 Hz frames to avoid duplicating four tile histories.
   */
  readonly personalGround:PersonalGroundBatch[]=[];
  /** Individually observed door state changes, never shared live door truth. */
  readonly doorKnowledge=new ReplayDoorObservationRecorder();
  /** Sparse seen-window states, never every window's live/current snapshot. */
  readonly windowKnowledge=new ReplayWindowObservationRecorder();
  private lastEventId=0;
  private lastExecutionEventId=0;
  private readonly discoveredBodies=new Set<string>();
  private readonly discoveredByObserver=new Map<string,Set<string>>();
  readonly motion=new ReplayMotionRecorder();
  readonly plans=new ReplayPlanRecorder();
  readonly ballistics=new ReplayBallisticsRecorder();
  manifest:ReplayManifest|null=null;
  private manifestLocked=false;
  readonly completeness:{
    complete:boolean;truncatedAt:number|null;reason:string|null
  }={complete:true,truncatedAt:null,reason:null};
  /** Paused edits do not create redundant world frames. */
  capturePlanning(s:Session):void{this.plans.capture(s);}
  /** Optional benchmark counters only; gameplay never reads these. */
  readonly sharingStats:ReplaySharingStats={
    sharedActors:0,sharedFields:0,fullKeyframes:0
  };
  capture(s:Session,force=false):void{
    // First capture starts the personal ground journal before simulation GO.
    enablePersonalGroundCapture(s);
    this.plans.capture(s);
    this.ballistics.capture(s);
    this.doorKnowledge.capture(s);
    // The mission may receive new appearance/kit settings before first GO.
    // Finalize the one-time manifest on the first executed simulation tick.
    if(!this.manifest||(!this.manifestLocked&&s.started))
      this.manifest=captureReplayManifest(s,this.manifest?.site);
    if(s.started)this.manifestLocked=true;
    if(this.frames.length>=12000){
      // Keep capped recordings honest and bounded.
      drainPersonalGround(s);
      if(this.completeness.complete){
        this.completeness.complete=false;
        this.completeness.truncatedAt=this.duration;
        this.completeness.reason='memory frame limit';
      }
      return;
    }
    // Do not record future observations after the film has hit its cap.
    this.windowKnowledge.capture(s);
    this.personalGround.push(...drainPersonalGround(s));
    // This runs at 60Hz even though the outcome film is only 20Hz.
    // Recording step starts here avoids tying animation to render FPS.
    this.motion.record(s.seconds,s.operators,s.doors);
    for(const e of s.battleEvents)if(e.id>this.lastEventId){
      this.events.push({...e,p:e.p?position(e.p):undefined});
      this.lastEventId=e.id;
    }
    for(const e of s.executionEvents)if(e.id>this.lastExecutionEventId){
      // All execution events belong to friendly, already-known actors.
      this.executionEvents.push({...e,p:position(e.p)});
      this.lastExecutionEventId=e.id;
    }
    // R3: execution transitions are authoritative tactical history. Do not
    // silently delete the oldest 900 entries: Plan-vs-Reality, chapter
    // navigation, and eventual archive export require the complete timeline.
    // Any future bounded storage must spill older events to replay chunks,
    // never erase them without marking the recording incomplete.
    const last=this.frames.at(-1);
    if(!force&&last&&s.seconds-last.t<.049)return;
    if(last&&Math.abs(last.t-s.seconds)<1e-6){
      if(force){
        const sample=snapshot(s,undefined,undefined,this.discoveredBodies,
          this.discoveredByObserver);
        for(const id of sample.knowledge?.discoveredBodyIds??[])
          this.discoveredBodies.add(id);
        this.frames[this.frames.length-1]=sample;
      }
      return;
    }
    // The limit is checked above and its incompleteness is explicitly reported.
    const remembered=last&&last.seenGround.length===s.seenGround.size?
      last.seenGround:undefined;
    const unchangedWorld=last&&last.objectRevision===s.objectRevision?
      last:undefined;
    const frame=snapshot(s,remembered,unchangedWorld,this.discoveredBodies,
      this.discoveredByObserver);
    for(const id of frame.knowledge?.discoveredBodyIds??[])
      this.discoveredBodies.add(id);
    for(const actor of frame.actors)
      actor.travelYaw=this.motion.direction(actor.id);
    // Explored ground only grows. Reuse identical history instead of
    // allocating thousands of duplicate tile arrays during long missions.
    if(last&&last.seenGround.length===frame.seenGround.length)
      frame.seenGround=last.seenGround;
    shareUnchangedReplayFrame(last,frame,this.frames.length,
      this.sharingStats);
    this.frames.push(frame);
  }
  get duration(){return this.frames.at(-1)?.t??0;}
  surrounding(time:number):{previous:ReplayFrame;next:ReplayFrame;alpha:number}|null{
    if(!this.frames.length)return null;
    const t=Math.max(0,Math.min(time,this.duration));
    let lo=0,hi=this.frames.length-1;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      if(this.frames[mid].t<=t)lo=mid;
      else hi=mid-1;
    }
    const previous=this.frames[lo];
    const next=this.frames[Math.min(lo+1,this.frames.length-1)];
    const alpha=next.t>previous.t?
      Math.max(0,Math.min(1,(t-previous.t)/(next.t-previous.t))):0;
    return {previous,next,alpha};
  }
  at(time:number):ReplayFrame|null{return this.surrounding(time)?.previous??null;}
  /** A render-only snapshot. Outcomes/discrete changes remain on the left
   * authoritative sample. No mutation of stored frames or motor state. */
  sample(time:number):ReplayFrame|null{
    const span=this.surrounding(time);
    if(!span)return null;
    const {previous,next,alpha}=span;
    const t=previous.t+(next.t-previous.t)*alpha;
    const byId=new Map(next.actors.map(a=>[a.id,a]));
    const actors=previous.actors.map(a=>{
      const b=byId.get(a.id);
      if(!b||!alpha)return {...a,p:position(a.p)};
      return {...a,p:{x:mix(a.p.x,b.p.x,alpha),
        y:mix(a.p.y,b.p.y,alpha)},
        heading:mixAngle(a.heading,b.heading,alpha),
        weaponYaw:mixAngle(a.weaponYaw,b.weaponYaw,alpha),
        travelYaw:mixAngle(a.travelYaw??a.heading,
          b.travelYaw??b.heading,alpha),
        velocity:mix(a.velocity,b.velocity,alpha),
        turning:mix(a.turning,b.turning,alpha),
        aim:mix(a.aim,b.aim,alpha),
        reload:mix(a.reload,b.reload,alpha),
        recoil:mix(a.recoil,b.recoil,alpha),
        stability:mix(a.stability,b.stability,alpha),
        stride:mix(a.stride,b.stride,alpha),
        traversalElevation:a.traversal&&b.traversal&&
          a.traversal.obstacleIndex===b.traversal.obstacleIndex?
          mix(a.traversalElevation,b.traversalElevation,alpha):
          a.traversalElevation,
        traversalElapsed:a.traversal&&b.traversal&&
          a.traversal.obstacleIndex===b.traversal.obstacleIndex?
          mix(a.traversalElapsed,b.traversalElapsed,alpha):
          a.traversalElapsed};
    });
    const nextCivilians=new Map((next.civilians??[]).map(c=>[c.id,c]));
    const civilians=(previous.civilians??[]).map(c=>{
      const later=nextCivilians.get(c.id);
      if(!later||!alpha)return {...c,p:position(c.p)};
      return {...c,p:{
        x:mix(c.p.x,later.p.x,alpha),
        y:mix(c.p.y,later.p.y,alpha)
      },heading:mixAngle(c.heading,later.heading,alpha),
      velocity:mix(c.velocity,later.velocity,alpha)};
    });
    const presentation=this.motion.presentation(t,actors.map(a=>a.id));
    for(const actor of actors)
      presentation.travelYaw[actor.id]=actor.travelYaw??actor.heading;
    const delta=t-previous.t;
    const nextDoors=new Map(next.doors.map(d=>[d.id,d]));
    const doors=previous.doors.map(d=>{
      const later=nextDoors.get(d.id);
      return {...d,openFraction:later?mix(
        d.openFraction??(d.open?1:0),
        later.openFraction??(later.open?1:0),alpha):d.openFraction};
    });
    return {...previous,t,actors,civilians,doors,presentation,
      shots:previous.shots.map(s=>({...shotCopy(s),age:s.age+delta})),
      grenades:previous.grenades.map(g=>({...g,p:position(g.p),
        from:position(g.from),to:position(g.to)}))};
  }
}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const mixAngle=(a:number,b:number,t:number)=>
  a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
// Track replay identity as well as count. Seeking between equally populated
// but differently explored moments must invalidate the rendered fog.
const replayGroundFrames=new WeakMap<Session,readonly string[]>();
export function applyReplayFrame(s:Session,f:ReplayFrame):void{
  if(replayGroundFrames.get(s)!==f.seenGround){
    s.seenGroundRevision++;
    replayGroundFrames.set(s,f.seenGround);
  }
  s.seconds=f.t;
  applyReplayKnowledge(s,f.knowledge);
  // Playback is not a live game phase. It can neither edit plans nor simulate.
  s.phase='running';s.mission=f.mission;
  for(const copy of f.actors){
    const a=s.operators.find(actor=>actor.id===copy.id);
    if(a)Object.assign(a,copy,{p:position(copy.p),
      traversal:traversalCopy(copy.traversal),traversalPending:null,
      aimInstruction:copy.aimInstruction?{...copy.aimInstruction,
        point:copy.aimInstruction.point?position(copy.aimInstruction.point):undefined}:null,
      spareMagazines:copy.spareMagazines.map(m=>({...m})),
      medical:copy.medical?copyMedicalCondition(copy.medical):newMedicalCondition(),
      medicalSupplies:normalizedMedicalSupplies(copy.medicalSupplies,
       kitMedicalSupplies(a.equipment)),
      plan:copyNodes(copy.plan??[]),nav:[]});
  }
  // Rewind the real civilian state, not only the old rescue marker. No
  // AI tick is executed while scrubbing; old films simply have no neutrals.
  const byId=new Map(s.civilians.map(c=>[c.id,c]));
  s.civilianHarmEvents=(f.civilianHarmEvents??[]).map(e=>({
    ...e,p:position(e.p)
  }));
  s.civilians=(f.civilians??[]).map(copy=>{
    const old=byId.get(copy.id);
    const actor=old??createCivilian({
      id:copy.id,role:copy.role,persona:copy.persona,
      activity:copy.activity,position:copy.p,heading:copy.heading,
      roomId:copy.homeRoomId,appearanceSeed:copy.appearanceSeed,
      isRescueTarget:copy.rescueTarget
    });
    return {...actor,...copy,p:position(copy.p),
      carriedById:copy.carriedById??null,
      transportMode:copy.transportMode??null,
      priorP:position(copy.p),goal:null,nav:[],
      // Older films with no visibility channel keep a guarded
      // current-cone fallback rather than disclosing future information.
      replayVisible:copy.visibleAtCapture
    };
  });
  s.doors=f.doors.map(d=>({...d,a:position(d.a),b:position(d.b)}));
  s.objectRevision=f.objectRevision??0;
  s.windows=(f.windows??[]).map(w=>({...w}));
  if(f.coverState){
    s.coverState=f.coverState.map(c=>({...c}));
    COVER.splice(0,COVER.length,...s.coverState);
  }
  s.shots=f.shots.map(shotCopy);
  s.casings=(f.casings??[]).map(x=>({...x}));
  s.dropped=f.dropped.map(m=>({...m,p:position(m.p)}));
  s.impactMarks=f.impactMarks.map(m=>({...m,p:position(m.p)}));
  s.grenades=f.grenades.map(g=>({...g,p:position(g.p),
    from:position(g.from),to:position(g.to)}));
  s.flashBursts=f.flashBursts.map(b=>({...b,p:position(b.p)}));
  s.flashRemaining=f.flashRemaining;
  s.missionType=f.missionType;s.holdTime=f.holdTime;
  s.rescue=f.rescue?{p:position(f.rescue.p),
    following:f.rescue.following}:null;
  s.scenario.objective=position(f.objective);
  s.seenGround=new Set(f.seenGround);
  s.intel=f.intel?intelRestore(f.intel):s.intel;
  s.intelObservedAt=f.t;
  s.known=new Map(f.known.map(([id,c])=>[id,
    {p:position(c.p),at:c.at,status:c.status}]));
}
