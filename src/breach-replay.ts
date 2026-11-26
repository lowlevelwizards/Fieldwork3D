import {sessionWorldGeometry,invalidateSessionWorldGeometry,publishSessionCoverToActiveSite} from './breach-world-context.ts';
/** Build 090–091: deterministic mission film, independent of the live motor.
 * We capture authoritative simulation outcomes at 20 Hz and never re-simulate
 * past actions. Rewind, scrubbing and speed changes cannot alter an outcome.
 */
import {type Session,type TeamActor,type ShotEvent,type DroppedMagazine,type FlashGrenade,type FlashBurst,type ImpactMark} from './breach-game.ts';
import {type Door,type Pt} from './breach-core.ts';
import {intelSnapshot,intelRestore,bindIntelWorld} from './breach-intel.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {ExecutionEvent} from './breach-execution-events.ts';
import {copyMedicalCondition,newMedicalCondition} from './breach-medical-wounds.ts';
import {normalizedMedicalSupplies,kitMedicalSupplies} from './equipment-medical-supplies.ts';
import type {FieldInventory} from './equipment-field-inventory.ts';
import {ReplayMotionRecorder,type ReplayPresentation} from './breach-replay-motion.ts';
import {ReplayPlanRecorder} from './breach-replay-plans.ts';
import {ReplayBallisticsRecorder} from './breach-replay-ballistics.ts';
import {captureReplayManifest,type ReplayManifest} from './breach-replay-manifest.ts';
import {copySitePowerState,createSitePowerState} from './equipment-site-power.ts';
import {withCoverPropIds} from './worldgen/site-object-identity.ts';
import {copyNodes,type PlanNode} from './breach-plan.ts';
import {initialSecondarySwitch,type SecondarySwitchState} from './secondary-switching.ts';
import {readSecondaryEquipment,type SecondaryEquipment} from './secondary-equipment.ts';
import type {SecondaryTimedReload} from './secondary-timed-reload.ts';
import {captureReplayKnowledge,applyReplayKnowledge,type ReplayKnowledge}
  from './breach-replay-visibility.ts';
import {captureEffectEvidence} from './breach-replay-effect-evidence.ts';
import {enablePersonalGroundCapture,drainPersonalGround,
  type PersonalGroundBatch} from './breach-replay-personal-ground.ts';
import {ReplayDoorObservationRecorder}
  from './breach-replay-door-knowledge.ts';
import {ReplayWindowObservationRecorder}
  from './breach-replay-window-knowledge.ts';
import {shareUnchangedReplayFrame,reuseFrozenReplayValue,
  REPLAY_FULL_KEYFRAME_INTERVAL,type ReplaySharingStats}
  from './breach-replay-sharing.ts';
import type {TraverseOpportunity} from './breach-mantle.ts';
import type {DoorHandContact} from './breach-door-hand-contact.ts';
import type {PhysicalContact} from './breach-physical-contact-anchor.ts';
import type {CivilianHarmEvent} from './breach-civilian-harm.ts';
import {createCivilian,type CivilianActor} from './breach-civilian-types.ts';
import type {DroppedFirearm} from './breach-suspect-weapons.ts';

export type ActorFrame=Pick<TeamActor,
  'id'|'p'|'heading'|'health'|'velocity'|'turning'|'posture'|'pace'|'alert'|
  'magazine'|'reserve'|'reload'|'shots'|'fireCd'|'aim'|
  'insertedMagazineId'|'spareMagazines'|'reloadMode'|'reloadStartedAt'|
  'reloadDuration'|'reloadRemoved'|'reloadInserted'|
  'reloadFromRounds'|'reloadTargetRounds'|'reloadSelectedMagazineId'|
  'lastHitAt'|'lastDownAt'|'lastHitRegion'|'lastHitYaw'|
  'lastHitSeverity'|'downPose'|'downClearance'|'flashUntil'|'suppression'|
  'wedgeRemaining'|'carryingId'|'carriedById'|'transportMode'|'transportLatched'|'downWeaponsReleased'|
  'lastTreatmentAt'|'lastTreatmentTargetId'|'treatmentActive'|'treatmentProgress'|
  'medical'|'medicalSupplies'|'weapon'|'weaponConfiguration'|'weaponLightOn'|'nvgDeployed'|'injuryStage'|'armorIntegrity'|'helmetIntegrity'|'flashCharges'|'morale'|'surrendered'|'defense'|'watch'|'aimInstruction'|
  'lastThrowAt'|'lastDoorAt'|'lastDoorId'|'lastDoorMethod'|'stride'|
  'weaponYaw'|'stability'|'recoil'|'lastShotAt'|'fireMode'|'burstCount'|'skills'|
  'squeeze'|'squeezeYaw'|'squeezeTime'|
  'traversal'|'traversalElapsed'|'traversalElevation'|
  'traversalRetreating'>;
export type ReplayActorFrame=ActorFrame & {
 /** S5.2: recorded explicit weapon hand, optional for all legacy films. */
 secondarySwitch?:SecondarySwitchState;
 /** S8.2: historical pistol magazine identity, rounds and handoff clock. */
 secondaryEquipment?:SecondaryEquipment;
 secondaryReload?:SecondaryTimedReload|null;
 /** D15.7 exact down and fatality evidence; absent in legacy films. */
 downedAt?:number|null;deathAt?:number|null;lastDownById?:string|null;
 /** D15 conscious surrender timestamp, not a down event. */
 lastSurrenderAt?:number;
 releasedWeaponId?:number|null;
 suspectEscapeMode?:TeamActor['suspectEscapeMode'];
 suspectEscapeWeaponId?:number|null;
 suspectEscapeStartedAt?:number;
 suspectEscapeCooldownUntil?:number;
 suspectEscapeGoal?:Pt|null;
 suspectRearmedSecondary?:boolean;
 /** Explicit issue status, absent for all historical legacy recordings. */
 secondaryIssued?:boolean;
 restrained?:boolean;lastCustodyAt?:number;
 suspectSearched?:boolean;
 escortLeaderId?:string|null;lastEscortRouteAt?:number;
 lastEscortCommandAt?:number;
 escortGoal?:Pt|null;
 /** F6: optional fixed-step clock of the authored active interaction.
  * Missing in older films means no credible mid-action hand retrieval. */
 actionTimer?:number;
 /** EQA3.16: auditory estimate at this film time, never future AI memory. */
 heard?:Pt|null;contact?:Pt|null;lastNoiseAt?:number;
 /** F2: sparse historical field inventory locations for actual replayed depletion. */
 fieldInventory?:FieldInventory;
 /** EQA3.10: finite physical restraint quantity (older films default zero). */
 restraintRemaining?:number;
 /** EQA3.9: actual SECURE/FOLLOW support-hand reach, absent in old film. */
 lastCivilianContactAt?:number;
 /** Optional for archived films recorded before D4. */
 doorHandContact?:DoorHandContact|null;
 kickFoot?:0|1|null;
 kickImpactPoint?:Pt|null;
 coverStanceDrop?:number;
 /** A3.6–7 optional for backwards-compatible historical films. */
 physicalContact?:PhysicalContact|null;
 travelYaw?:number;intentKind?:string;awarenessCount?:number;
 /** Optional on historical films: A3.2 physical lateral weapon accommodation. */
 aimSideOffset?:number;
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
    /** Added in EQA3.9: old films omit them and use completed posture. */
    stateSince?:number;restrained?:boolean;
    /** Civilian's own witnessed sensory direction, NEVER full enemy truth. */
    lastEvidenceAt?:number;threatEstimate?:Pt|null;
    /** Newer films preserve witnessed gunshot flinch timing. */
    lastFlinchAt?:number;
    /** Historical successful physical contact only; optional old films. */
    lastContactAt?:number;lastContactPoint?:Pt|null;
    lastEvidenceId?:string|null;
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
  /** L1.1: optional historical circuit snapshot. Old films omit it. */
  sitePower?:Session['sitePower'];
  casings:Session['casings'];
  dropped:DroppedMagazine[];impactMarks:ImpactMark[];grenades:FlashGrenade[];
  /** D15 optional world-firearm history; absent in old films. */
  droppedFirearms?:DroppedFirearm[];
  flashBursts:FlashBurst[];flashRemaining:number;
  atmosphere?:Session['atmosphere'];
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
  start:position(shot.start),end:position(shot.end),
  ...(shot.materialImpacts?{materialImpacts:shot.materialImpacts.map(c=>({...c,p:position(c.p)}))}:{})});
/** Live event rings are capped; replay keeps every unique event. Their IDs
 * are monotonically appended, so jump directly to the unrecorded suffix
 * instead of walking 240/500 old entries sixty times a second. */
function firstUnrecorded(events:readonly {id:number}[],lastId:number):number{
  let lo=0,hi=events.length;
  while(lo<hi){
    const mid=(lo+hi)>>>1;
    if(events[mid].id<=lastId)lo=mid+1;
    else hi=mid;
  }
  return lo;
}
export function snapshot(s:Session,seenGround?:string[],
  unchangedWorld?:Pick<ReplayFrame,'windows'|'coverState'|'sitePower'>,
  previouslyDiscovered:ReadonlySet<string>=new Set(),
  observerBodies:Map<string,Set<string>>=new Map(),
  previousActors?:readonly ReplayActorFrame[],
  priorEffects?:ReplayFrame):ReplayFrame{
  // Build the keyed prior-frame lookup directly instead of allocating
  // a second temporary [id, actor] array on every outcome-film sample.
  const actorBefore=previousActors?new Map<string,ReplayActorFrame>():null;
  if(actorBefore)for(const actor of previousActors!)actorBefore.set(actor.id,actor);
  // The immutable observer journal already computes exact current civilian
  // visibility. Reuse it for the 20 Hz frame instead of tracing LOS twice.
  const knowledge=captureReplayKnowledge(s,previouslyDiscovered,observerBodies);
  const effectEvidence=captureEffectEvidence(s,priorEffects?.knowledge?.effectEvidence);
  if(effectEvidence)knowledge.effectEvidence=effectEvidence;
  // A frame can contain many civilians. Index the captured *historical*
  // visibility once; never recalculate LOS or consult future observations.
  const visibleCivilians=new Set(knowledge.visibleCivilianIds);
  return {
    t:s.seconds,phase:s.phase,mission:s.mission,
    actors:s.operators.map(a=>{
      const prior=actorBefore?.get(a.id);
      return {id:a.id,p:position(a.p),
      plan:reuseFrozenReplayValue(a.plan,prior?.plan,()=>copyNodes(a.plan)),
      actionTimer:a.actionTimer,
      heading:a.heading,health:a.health,velocity:a.velocity,
      squeeze:a.squeeze,squeezeYaw:a.squeezeYaw,squeezeTime:a.squeezeTime,
      traversal:traversalCopy(a.traversal),
      traversalElapsed:a.traversalElapsed,
      traversalElevation:a.traversalElevation,
      traversalRetreating:a.traversalRetreating,
      turning:a.turning,posture:a.posture,pace:a.pace,alert:a.alert,
      heard:a.heard?position(a.heard):null,
      contact:a.contact?position(a.contact):null,
      lastNoiseAt:a.lastNoiseAt,
      magazine:a.magazine,reserve:a.reserve,reload:a.reload,
      secondarySwitch:a.secondarySwitch?{...a.secondarySwitch}:initialSecondarySwitch(),
      secondaryEquipment:a.equipment?.secondary?
        reuseFrozenReplayValue(a.equipment.secondary,prior?.secondaryEquipment,
          ()=>structuredClone(a.equipment!.secondary!)):undefined,
      secondaryReload:a.secondaryReload?{...a.secondaryReload}:null,
      insertedMagazineId:a.insertedMagazineId,
      spareMagazines:reuseFrozenReplayValue(a.spareMagazines,
        prior?.spareMagazines,()=>a.spareMagazines.map(m=>({...m}))),
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
       downClearance:a.downClearance,
      flashUntil:a.flashUntil,suppression:a.suppression,
      weapon:a.weapon,weaponConfiguration:reuseFrozenReplayValue(
        a.weaponConfiguration,prior?.weaponConfiguration,
        ()=>a.weaponConfiguration?
          structuredClone(a.weaponConfiguration):undefined),
       injuryStage:a.injuryStage,medical:reuseFrozenReplayValue(
         a.medical,prior?.medical,()=>copyMedicalCondition(a.medical)),
       medicalSupplies:reuseFrozenReplayValue(a.medicalSupplies,
         prior?.medicalSupplies,()=>({...a.medicalSupplies})),
       lastTreatmentAt:a.lastTreatmentAt,
       lastTreatmentTargetId:a.lastTreatmentTargetId,
       treatmentActive:a.treatmentActive,treatmentProgress:a.treatmentProgress,
       carryingId:a.carryingId,carriedById:a.carriedById,
       transportLatched:a.transportLatched??false,
       downWeaponsReleased:a.downWeaponsReleased??false,
       transportMode:a.transportMode??null,
       wedgeRemaining:a.wedgeRemaining,
       restraintRemaining:a.restraintRemaining,
       fieldInventory:a.equipment?.fieldInventory?
         reuseFrozenReplayValue(a.equipment.fieldInventory,
           prior?.fieldInventory,
           ()=>({version:1 as const,stacks:
             a.equipment!.fieldInventory!.stacks.map(row=>({...row}))})):
         undefined,
       weaponLightOn:a.weaponLightOn,
       nvgDeployed:a.nvgDeployed===true,
      armorIntegrity:a.armorIntegrity,helmetIntegrity:a.helmetIntegrity,
      flashCharges:a.flashCharges,
      morale:a.morale,
      lastThrowAt:a.lastThrowAt,lastDoorAt:a.lastDoorAt,
      lastCivilianContactAt:a.lastCivilianContactAt??-100,
      lastDoorId:a.lastDoorId,lastDoorMethod:a.lastDoorMethod,
      kickFoot:a.kickFoot??null,
      kickImpactPoint:a.kickImpactPoint?position(a.kickImpactPoint):null,
      coverStanceDrop:a.coverStanceDrop??0,
      doorHandContact:a.doorHandContact?{
        ...a.doorHandContact,point:{...a.doorHandContact.point}
      }:null,
      physicalContact:a.physicalContact?{
        ...a.physicalContact,anchor:{...a.physicalContact.anchor,
          point:{...a.physicalContact.anchor.point},
          normal:{...a.physicalContact.anchor.normal}}
      }:null,
      stride:a.stride,
      weaponYaw:a.weaponYaw,aimSideOffset:a.aimSideOffset??0,
      stability:a.stability,recoil:a.recoil,
      lastShotAt:a.lastShotAt,fireMode:a.fireMode,burstCount:a.burstCount,
      skills:reuseFrozenReplayValue(a.skills,prior?.skills,
        ()=>({...a.skills})),
      downedAt:a.downedAt??null,deathAt:a.deathAt??null,
      lastDownById:a.lastDownById??null,
      surrendered:a.surrendered,lastSurrenderAt:a.lastSurrenderAt,
      releasedWeaponId:a.releasedWeaponId??null,
      suspectEscapeMode:a.suspectEscapeMode??null,
      suspectEscapeWeaponId:a.suspectEscapeWeaponId??null,
      suspectEscapeStartedAt:a.suspectEscapeStartedAt??-100,
      suspectEscapeCooldownUntil:a.suspectEscapeCooldownUntil??0,
      suspectEscapeGoal:a.suspectEscapeGoal?position(a.suspectEscapeGoal):null,
      suspectRearmedSecondary:a.suspectRearmedSecondary===true,
      secondaryIssued:!!a.equipment?.secondary?.weapon,
      restrained:a.restrained===true,lastCustodyAt:a.lastCustodyAt,
      suspectSearched:a.suspectSearched===true,
      escortLeaderId:a.escortLeaderId??null,
      escortGoal:a.escortGoal?position(a.escortGoal):null,
      lastEscortRouteAt:a.lastEscortRouteAt,
      lastEscortCommandAt:a.lastEscortCommandAt,
      defense:a.defense?position(a.defense):null,
      watch:a.watch?position(a.watch):null,
      aimInstruction:a.aimInstruction?{...a.aimInstruction,
        point:a.aimInstruction.point?position(a.aimInstruction.point):undefined}:null,
      intentKind:a.intent?.kind,awarenessCount:Object.keys(a.awareness.contacts).length};
    }),
    civilianHarmEvents:reuseFrozenReplayValue(
      s.civilianHarmEvents,priorEffects?.civilianHarmEvents,
      ()=>s.civilianHarmEvents.map(e=>({...e,p:position(e.p)}))),
    civilians:s.civilians.map(c=>({
      id:c.id,p:position(c.p),heading:c.heading,health:c.health,
      injuryStage:c.injuryStage,state:c.state,stateSince:c.stateSince,
      restrained:c.restrained===true,velocity:c.velocity,
      lastEvidenceAt:c.lastEvidenceAt,lastFlinchAt:c.lastFlinchAt??-100,
      lastEvidenceId:c.lastEvidenceId,
      lastContactAt:c.lastContactAt,
      lastContactPoint:c.lastContactPoint?position(c.lastContactPoint):null,
      threatEstimate:c.threatEstimate?position(c.threatEstimate):null,
      lastHitAt:c.lastHitAt,following:c.following,
      carriedById:c.carriedById,transportMode:c.transportMode,
      rescueTarget:c.rescueTarget,appearanceSeed:c.appearanceSeed,
      role:c.role,persona:c.persona,activity:c.activity,
      homeRoomId:c.homeRoomId,
      visibleAtCapture:visibleCivilians.has(c.id)
    })),
    doors:reuseFrozenReplayValue(s.doors,priorEffects?.doors,
      ()=>s.doors.map(d=>({...d,a:position(d.a),b:position(d.b)}))),
    objectRevision:s.objectRevision,
    sitePower:unchangedWorld?.sitePower?.revision===s.sitePower?.revision&&
      unchangedWorld?.sitePower?.mode===s.sitePower?.mode?
      unchangedWorld?.sitePower:copySitePowerState(s.sitePower),
    // Replay already shares these immutable samples until objectRevision moves.
    // Avoid allocating copies just to throw them away in capture().
    windows:unchangedWorld?.windows??s.windows.map(w=>({...w})),
    coverState:unchangedWorld?.coverState??s.coverState.map(o=>({...o})),
    shots:reuseFrozenReplayValue(s.shots,priorEffects?.shots,
      ()=>s.shots.map(shotCopy)),
    casings:reuseFrozenReplayValue(s.casings,priorEffects?.casings,
      ()=>s.casings.map(x=>({...x}))),
    dropped:reuseFrozenReplayValue(s.dropped,priorEffects?.dropped,
      ()=>s.dropped.map(m=>({...m,p:position(m.p)}))),
    droppedFirearms:reuseFrozenReplayValue(s.droppedFirearms,
      priorEffects?.droppedFirearms,
      ()=>s.droppedFirearms.map(w=>({...w,p:position(w.p),
        weaponConfiguration:w.weaponConfiguration?
          structuredClone(w.weaponConfiguration):undefined,
        secondaryEquipment:w.secondaryEquipment?
          structuredClone(w.secondaryEquipment):undefined}))),
    impactMarks:reuseFrozenReplayValue(s.impactMarks,priorEffects?.impactMarks,
      ()=>s.impactMarks.map(m=>({...m,p:position(m.p),...(m.surfaceRef?{surfaceRef:{...m.surfaceRef}}:{})}))),
    grenades:reuseFrozenReplayValue(s.grenades,priorEffects?.grenades,
      ()=>s.grenades.map(g=>({...g,p:position(g.p),
        from:position(g.from),to:position(g.to)}))),
    flashBursts:reuseFrozenReplayValue(s.flashBursts,priorEffects?.flashBursts,
      ()=>s.flashBursts.map(b=>({...b,p:position(b.p)}))),
    ...(s.atmosphere?.length?{atmosphere:reuseFrozenReplayValue(s.atmosphere,priorEffects?.atmosphere,
      ()=>s.atmosphere!.map(c=>({...c,p:position(c.p)})))}:{}),
    flashRemaining:s.flashRemaining,
    missionType:s.missionType,holdTime:s.holdTime,
    rescue:s.rescue?{p:position(s.rescue.p),following:s.rescue.following}:null,
    objective:position(s.scenario.objective),
    seenGround:seenGround??[...s.seenGround],intel:intelSnapshot(s.intel),
    known:[...s.known].map(([id,c])=>[id,
      {p:position(c.p),at:c.at,status:c.status}]),
    knowledge,
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
  /** Paused edits do not create redundant world frames. A capped film must
   * not continue accumulating revisions after its declared final sample. */
  capturePlanning(s:Session):void{
    if(this.frames.length<12000)this.plans.capture(s);
  }
  /** Optional benchmark counters only; gameplay never reads these. */
  readonly sharingStats:ReplaySharingStats={
    sharedActors:0,sharedFields:0,fullKeyframes:0
  };
  capture(s:Session,force=false):void{
    // E5.2: all archived writers must stop at the SAME declared film cap.
    // Previously plan/ballistic/door journals grew after outcome frames
    // stopped, retaining evidence beyond the advertised replay duration.
    if(this.frames.length>=12000){
      drainPersonalGround(s);
      if(this.completeness.complete){
        this.completeness.complete=false;
        this.completeness.truncatedAt=this.duration;
        this.completeness.reason='memory frame limit';
      }
      return;
    }
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
    // Do not record future observations after the film has hit its cap.
    this.windowKnowledge.capture(s);
    this.personalGround.push(...drainPersonalGround(s));
    // This runs at 60Hz even though the outcome film is only 20Hz.
    // Recording step starts here avoids tying animation to render FPS.
    this.motion.record(s.seconds,s.operators,s.doors);
    const battle=s.battleEvents;
    if(battle.length&&battle[battle.length-1].id>this.lastEventId)
      for(let i=firstUnrecorded(battle,this.lastEventId);i<battle.length;i++){
        const e=battle[i];
        this.events.push({...e,p:e.p?position(e.p):undefined});
        this.lastEventId=e.id;
      }
    const execution=s.executionEvents;
    if(execution.length&&execution[execution.length-1].id>
       this.lastExecutionEventId)
      for(let i=firstUnrecorded(execution,this.lastExecutionEventId);
          i<execution.length;i++){
        const e=execution[i];
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
    // A complete independent keyframe every 40 samples is necessary for
    // random-access recovery. Between keyframes, reuse only equal values.
    const priorActors=last&&this.frames.length%
      REPLAY_FULL_KEYFRAME_INTERVAL!==0?last.actors:undefined;
    // E5.1: avoid allocating identical door/effect/casualty snapshots
    // before sharing discovers they are unchanged. The source is live and
    // may be mutated in place: compare by VALUE, never array identity.
    // Every full keyframe remains independently owned, as before.
    const priorEffects=priorActors?last:undefined;
    const frame=snapshot(s,remembered,unchangedWorld,this.discoveredBodies,
      this.discoveredByObserver,priorActors,priorEffects);
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
    const byId=new Map<string,(typeof next.actors)[number]>();
    for(const a of next.actors)byId.set(a.id,a);
    const actors=previous.actors.map(a=>{
      const b=byId.get(a.id);
      if(!b||!alpha)return {...a,p:position(a.p)};
      return {...a,p:{x:mix(a.p.x,b.p.x,alpha),
        y:mix(a.p.y,b.p.y,alpha)},
        heading:mixAngle(a.heading,b.heading,alpha),
        weaponYaw:mixAngle(a.weaponYaw,b.weaponYaw,alpha),
        aimSideOffset:mix(a.aimSideOffset??0,b.aimSideOffset??0,alpha),
        travelYaw:mixAngle(a.travelYaw??a.heading,
          b.travelYaw??b.heading,alpha),
        velocity:mix(a.velocity,b.velocity,alpha),
        turning:mix(a.turning,b.turning,alpha),
        aim:mix(a.aim,b.aim,alpha),
        coverStanceDrop:mix(a.coverStanceDrop??0,
          b.coverStanceDrop??0,alpha),
        reload:mix(a.reload,b.reload,alpha),
        secondarySwitch:{...(a.secondarySwitch??initialSecondarySwitch()),
          fraction:mix(a.secondarySwitch?.fraction??0,
            b.secondarySwitch?.fraction??0,alpha)},

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
    const nextCivilians=new Map<string,
      NonNullable<ReplayFrame['civilians']>[number]>();
    for(const c of next.civilians??[])nextCivilians.set(c.id,c);
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
    const nextDoors=new Map<string,(typeof next.doors)[number]>();
    for(const door of next.doors)nextDoors.set(door.id,door);
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
      // Archived films have no sidearm channel; neutralize stale future
      // state rather than leaking a selected pistol across seek.
      secondarySwitch:copy.secondarySwitch?{...copy.secondarySwitch}:initialSecondarySwitch(),
      secondaryReload:copy.secondaryReload?{...copy.secondaryReload}:null,
      // F2: rewind physically carried locations as well as the HUD counters.
      // Archived frames without this optional field keep their old kit.
      ...(a.equipment&&(copy.fieldInventory||copy.secondaryEquipment||
          copy.secondaryIssued===false)?{
        equipment:{...a.equipment,
          ...(copy.fieldInventory?{fieldInventory:{version:1 as const,
            stacks:copy.fieldInventory.stacks.map(row=>({...row}))}}:{}),
          ...(copy.secondaryIssued===false?{secondary:undefined}:
            copy.secondaryEquipment?{
              secondary:readSecondaryEquipment(copy.secondaryEquipment,a.id)}:{})
        }}:{}),
      // Absent in legacy L1.4 films; do not retain future device state on rewind.
      nvgDeployed:copy.nvgDeployed===true,
      lastCivilianContactAt:copy.lastCivilianContactAt??-100,
      // Historical frames without a mode cannot inherit the future one.
      transportMode:copy.transportMode??null,
      transportLatched:copy.transportLatched??false,
      downWeaponsReleased:copy.downWeaponsReleased??false,
      downedAt:copy.downedAt??null,deathAt:copy.deathAt??null,
      lastDownById:copy.lastDownById??null,
      lastSurrenderAt:copy.lastSurrenderAt,
      releasedWeaponId:copy.releasedWeaponId??null,
      suspectEscapeMode:copy.suspectEscapeMode??null,
      suspectEscapeWeaponId:copy.suspectEscapeWeaponId??null,
      suspectEscapeStartedAt:copy.suspectEscapeStartedAt??-100,
      suspectEscapeCooldownUntil:copy.suspectEscapeCooldownUntil??0,
      suspectEscapeGoal:copy.suspectEscapeGoal?position(copy.suspectEscapeGoal):null,
      suspectRearmedSecondary:copy.suspectRearmedSecondary===true,
      restrained:copy.restrained===true,
      lastCustodyAt:copy.lastCustodyAt,
      suspectSearched:copy.suspectSearched===true,
      escortLeaderId:copy.escortLeaderId??null,
      escortGoal:copy.escortGoal?position(copy.escortGoal):null,
      lastEscortRouteAt:copy.lastEscortRouteAt??-100,
      lastEscortCommandAt:copy.lastEscortCommandAt,
      actionTimer:copy.actionTimer??0,
      heard:copy.heard?position(copy.heard):null,
      contact:copy.contact?position(copy.contact):null,
      lastNoiseAt:copy.lastNoiseAt??-100,
      restraintRemaining:copy.restraintRemaining??0,
      // Pre-A3.6 films have no anchor: do not leak one from a later seek.
      kickFoot:copy.kickFoot??null,
      kickImpactPoint:copy.kickImpactPoint?
        position(copy.kickImpactPoint):null,
      coverStanceDrop:copy.coverStanceDrop??0,
      coverStanceSource:null,
      pivotEpisode:null,
      physicalContact:copy.physicalContact?{
        ...copy.physicalContact,anchor:{...copy.physicalContact.anchor,
          point:{...copy.physicalContact.anchor.point},
          normal:{...copy.physicalContact.anchor.normal}}
      }:null,
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
      stateSince:copy.stateSince??(copy.state==='compliant'?f.t-2:f.t),
      restrained:copy.restrained===true,
      // Never retain a present-day/omniscient gaze target on film rewind.
      lastEvidenceAt:copy.lastEvidenceAt??-1,
      lastFlinchAt:copy.lastFlinchAt??-100,
      lastEvidenceId:copy.lastEvidenceId??null,
      lastContactAt:copy.lastContactAt??-100,
      lastContactPoint:copy.lastContactPoint?position(copy.lastContactPoint):null,
      threatEstimate:copy.threatEstimate?position(copy.threatEstimate):null,
      carriedById:copy.carriedById??null,
      transportMode:copy.transportMode??null,
      priorP:position(copy.p),goal:null,nav:[],
      // Older films with no visibility channel keep a guarded
      // current-cone fallback rather than disclosing future information.
      replayVisible:copy.visibleAtCapture
    };
  });
  s.droppedFirearms=(f.droppedFirearms??[]).map(w=>({...w,
    p:position(w.p),weaponConfiguration:w.weaponConfiguration?
      structuredClone(w.weaponConfiguration):undefined,
    secondaryEquipment:w.secondaryEquipment?
      structuredClone(w.secondaryEquipment):undefined}));
  s.doors=f.doors.map(d=>({...d,a:position(d.a),b:position(d.b)}));
  s.objectRevision=f.objectRevision??0;
  // Seek/rewind restores the actual circuit state from this exact film frame.
  // Pre-L1.1 recordings carry no power data and retain preset-only defaults.
  s.sitePower=f.sitePower?copySitePowerState(f.sitePower):
   s.site?createSitePowerState(s.site,s.lightingMode):undefined;
  s.illuminationRevision=(s.illuminationRevision??0)+1;
  s.windows=(f.windows??[]).map(w=>({...w}));
  if(f.coverState){
    s.coverState.splice(0,s.coverState.length,
      ...withCoverPropIds(f.coverState).map(c=>({...c})));
    invalidateSessionWorldGeometry(s);
    publishSessionCoverToActiveSite(s);
  }
  s.shots=f.shots.map(shotCopy);
  // V20 flight records are immutable at emission and read-only during playback.
  s.casings=(f.casings??[]).map(x=>({...x}));
  s.dropped=f.dropped.map(m=>({...m,p:position(m.p)}));
  s.impactMarks=f.impactMarks.map(m=>({...m,p:position(m.p),...(m.surfaceRef?{surfaceRef:{...m.surfaceRef}}:{})}));
  s.grenades=f.grenades.map(g=>({...g,p:position(g.p),
    from:position(g.from),to:position(g.to)}));
  s.flashBursts=f.flashBursts.map(b=>({...b,p:position(b.p)}));
  s.atmosphere=f.atmosphere?.map(c=>({...c,p:position(c.p)}));
  s.flashRemaining=f.flashRemaining;
  s.missionType=f.missionType;s.holdTime=f.holdTime;
  s.rescue=f.rescue?{p:position(f.rescue.p),
    following:f.rescue.following}:null;
  s.scenario.objective=position(f.objective);
  s.seenGround=new Set(f.seenGround);
  s.intel=f.intel?intelRestore(f.intel):s.intel;
  bindIntelWorld(s.intel,sessionWorldGeometry(s));
  s.intelObservedAt=f.t;
  s.known=new Map(f.known.map(([id,c])=>[id,
    {p:position(c.p),at:c.at,status:c.status}]));
}
