import {withActions} from './breach-actor-initial-state.ts';
import {createCombatFiringPipeline} from './breach-firing-pipeline.ts';
import {advanceActorSightProgress,observeActorContactEvidence} from './breach-visual-acquisition.ts';
import {createEnemyDecisionController} from './breach-enemy-decision-controller.ts';
import {edit,validEditedPlan,validKnownPieArc,knownDoorApproach,
 atomicTeamEdit,sealPlanHistoryForExecution,undoAuthoredPlan,redoAuthoredPlan}
 from './breach-plan-authoring.ts';
import {advanceSimulationTick,type SimulationPhasePort} from './breach-simulation-phases.ts';
import {advanceMedicalDoorPhase} from './breach-simulation-medical-door-phase.ts';
import {advanceBeliefAgingPhase} from './breach-simulation-belief-phase.ts';
import {advanceSimulationActors,type ActorSimulationPhasePort} from './breach-simulation-actor-phase.ts';
import {advanceSimulationMotion,type MotionSimulationPhasePort} from './breach-simulation-motion-phase.ts';

import {advanceActorMotor} from './breach-actor-motor.ts';
import {createOrderExecutor} from './breach-order-executor.ts';
import {advanceMotorTraversal} from './breach-motor-traversal.ts';
import type {ActorMotorHooks} from './breach-motor-contract.ts';


/**
 * Fieldwork Breach 053–062: authoritative, fixed-step tactical session.
 * Author intent is editable PlanNode[]; motor navigation is transient.
 * The core retains the 052 static geometry and starter actors, not its old simulation.
 */
import {type Pt,type Operator,type TacticalState,type Door,type Side,W,H,COVER,OPERATOR_RADIUS,initialDoors,newTacticalState,activateSite,segmentsCross,doorCenter,doorBlocksSegment,doorBlocksRay,doorBlocksSightRay,pointToSegment,} from './breach-core.ts';
import {type PlanNode,type PlanHistory,type PlanKind,type DoorMethod,type AimMode,type AimInstruction,makeHistory,copyNodes,modifyNode,lastPoint,type FirePolicy,type PlanControlSnapshot,length,targetAngle,angleDifference,type PieSide} from './breach-plan.ts';
import {entryLanes} from './breach-entry-lanes.ts';
import {stackApproachPositions} from './breach-entry-coordination.ts';
import {generateSite,type Site,type SiteScale,seeded} from './breach-site.ts';
import type {OperationDossierV1} from './briefing/briefing-types.ts';
import type {EncounterContext,EncounterActivity,EncounterReadiness,EncounterRole} from './worldgen/encounter-types.ts';

import {WEAPONS,injuryReload,exposure,type WeaponId,type BattleEvent} from './breach-combat.ts';
import {validateThrow,sampleThrow,type ThrowPath} from './breach-flash.ts';
import {segmentHitsBox} from './breach-ray.ts';

import {microKeyAt} from './breach-fog-memory.ts';
import {forEachGroundSightCandidate} from './breach-ground-discovery.ts';
import {coarseGroundEvidenceAt} from './breach-ground-knowledge.ts';
import {groundView,groundViewCandidate} from './breach-ground-view.ts';
import {sightDiagnosticsEnabled,sightDiagnosticCounts} from './breach-sight-cost-counters.ts';
import {cachedActorGroundView} from './breach-live-visual-candidates.ts';
import {notePersonalGround} from './breach-replay-personal-ground.ts';
import {type FireBlock} from './breach-fire-safety.ts';


import {coverBlocksOpticalSight} from './breach-optical-occlusion.ts';
import {initDoor,doorReachable} from './breach-door.ts';

import {entryToolVerdict,type EntryTool} from './breach-entry-tools.ts';
import {canUseEntryTool} from './equipment-entry-tools.ts';

import {type AutoSidestep} from './breach-auto-sidestep.ts';


import {type MotorPause,type ExecutionIssue,type ExecutionStatus} from './breach-execution-state.ts';
import {type ExecutionEvent} from './breach-execution-events.ts';
import {relocateCover,canRelocateCover} from './breach-movable-cover.ts';
import {canAutoShove} from './breach-traversal-surfaces.ts';
import {materialForFixture,MATERIALS} from './breach-materials.ts';



import {initializeWindows,type WindowState} from './breach-windows.ts';
import {type AIIntent} from './breach-ai-policy.ts';

import {registerSessionWorldGeometry,sessionWorldGeometry,publishSessionCoverToActiveSite,setPresentationWorldSession} from './breach-world-context.ts';


import type {SuspicionMemory} from './breach-ai-suspicion.ts';

import {TacticalRouteCache} from './breach-tactical-route-cache.ts';
import {PerceptionPairCache} from './breach-perception-cache.ts';





import {createCivilian,setCivilianState,type CivilianActor} from './breach-civilian-types.ts';
import {civilianRefugePoints} from './breach-civilian-refuge.ts';
import {rescueEscortSeparated,rescueFollowGoal} from './breach-civilian-mission.ts';


import {attributableCivilianHarm,type CivilianHarmEvent} from './breach-civilian-harm.ts';

import {type CombatAction} from './breach-ai-combat.ts';

import {type TacticalReport} from './breach-communication.ts';
import {type GroupRole} from './breach-ai-coordination.ts';


import type {ActorAwareness} from './breach-awareness.ts';
import {confirmedSight} from './breach-visual-perception.ts';

import type {LightingMode} from './equipment-site-lighting.ts';
import {type PassageLease} from './breach-passage.ts';

import {planDoorSchedule,type PassageSchedule} from './breach-passage-plan.ts';
import {projectReachableGoal,type Blocker} from './breach-nav-diagnostics.ts';
import {sweptBodyClear,SQUEEZE_RADIUS} from './breach-navigation.ts';
import {routeWithSqueezeIntel,routeWithSqueezeWorld} from './breach-squeeze-route.ts';
import {knownPortalStrokeRoute} from './breach-known-portal-stroke.ts';
import {probeObstacleCrossing,probeWindowPortalRoute,canOpenWindowForClimb,traversalRouteLength,type TraverseOpportunity} from './breach-mantle.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {issueWeaponPreset,starterWeaponPreset} from './breach-weapon-issue.ts';
import {enemyKitForEncounter} from './breach-enemy-loadouts.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import {kitMedicalSupplies,medicalSupplyCount,type FieldMedicalSupplies} from './equipment-medical-supplies.ts';
import {treatmentSupplyForWound} from './breach-medical-treatment.ts';

import {stabilizationSummary} from './breach-casualty-status.ts';
import {type TransportMode} from './breach-casualty-transport.ts';
import {civilianTransportEligible} from './breach-civilian-transport.ts';
import {changeWeaponPlatform,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';

import type {ShootingSkills} from './breach-skills.ts';
import {type FiringMode} from './breach-ballistics.ts';


import {advanceRescueEscort,type RescueEscort} from './breach-rescue-escort.ts';
import {verifiedDeploymentChoices,type DeploymentChoice} from './breach-deployment.ts';
import {operationBrief,assessOperation,type OperationKind} from './breach-operations.ts';

import {initialIntel,bindIntelWorld,observeIntel,routeWithIntel,intelPassable,doorKnown,type IntelMode,type IntelState} from './breach-intel.ts';

import {stageMagazines,chooseReloadMagazine,reloadMagazineDelay} from './equipment-magazine-placement.ts';
import {magazineKit,reloadDuration as reloadTiming,type MagazineItem,type ReloadMode} from './breach-magazines.ts';
import {liveMagazineCapacity,freshMagazineIssue} from './arsenal/live-magazine-capacity.ts';


import {type EjectedCasing} from './breach-effects.ts';
import {type WoundRegion,type FallPose} from './breach-wounds.ts';
import {mostUrgentWound,type MedicalCondition} from './breach-medical-wounds.ts';

export type Posture='stand'|'crouch';
export type Alert='idle'|'suspicious'|'investigating'|'engaging'|'cover'|'retreat';
export type Personality='guard'|'aggressor'|'cautious';
export type TeamActor=Operator & {
  medical:MedicalCondition;medicalSupplies:FieldMedicalSupplies;
  lastTreatmentAt:number;lastTreatmentTargetId:string|null;
  treatmentActive:boolean;treatmentProgress:number;
  carryingId:string|null;carriedById:string|null;
  wedgeRemaining:number;
  awareness:ActorAwareness;
  suspicion:SuspicionMemory;lastVisualSuspicionId:string|null;
  intent:AIIntent|null;combatChoice:CombatAction|null;lastReportAt:number;
  coordinationRole:GroupRole|null;coordinationUntil:number;
  lastMoraleEventAt:number;
  searchOrigin:Pt|null;searchQueue:Pt[];searchPauseUntil:number;
  plan:PlanNode[];history:PlanHistory;nav:Pt[];activeNode:number;
  posture:Posture;pace:'walk'|'run';alert:Alert;velocity:number;turning:number;
  aim: number;targetId:string|null;suppression:number;stamina:number;
  magazine:number;reserve:number;reload:number;hits:number;kills:number;
  pointShots:number;aimedShots:number;longHits:number;
  insertedMagazineId:string;spareMagazines:MagazineItem[];
  reloadMode:ReloadMode|null;reloadStartedAt:number;
  reloadDuration:number;reloadRemoved:boolean;reloadInserted:boolean;
  reloadFromRounds:number;reloadTargetRounds:number;
  reloadSelectedMagazineId:string|null;
  stopped:boolean;haltOnContact:boolean;retreatPoint:Pt|null;
  contact:Pt|null;heard:Pt|null;
  alertUntil:number;waitRemaining:number;syncReady:string|null;
  actionTimer:number;blockedTime:number;lastNavRepairAt:number;priorP:Pt;pieIndex:number;
  /** Independent comfort-probe cooldown; never suppress stuck recovery. */
  lastNormalLaneProbeAt:number;
  recoveryAttempts:number;retryRouteAt:number;routeGoalKey:string;
  /** Rate-limit physical clutter nudges and scene rebuilds. */
  lastAutoShoveAt:number;
  /** Motor-authoritative traversal state. The normal body never shrinks. */
  squeeze:boolean;squeezeYaw:number;squeezeTime:number;
  /** Transit is transient motor intent, not an authored waypoint. */
  traversalPending:TraverseOpportunity|null;
  traversal:TraverseOpportunity|null;traversalElapsed:number;
  traversalElevation:number;lastTraversalAt:number;
  /** Reverses an interrupted climb along the verified approach trajectory. */
  traversalRetreating:boolean;
  lastBlocker:Blocker;
  /** Execution diagnostics are transient; never rewrite authored PlanNode[]. */
  motorPause:MotorPause;orderIssue:ExecutionIssue|null;
  completedOrders:number;passageWaitSeconds:number;passageStallReported:boolean;
  executionLastStatus:ExecutionStatus|null;
  /** Last executed facing command; survives across movement waypoints. */
  aimInstruction:AimInstruction|null;
  /** Simulation-timed cues, not new combat rules. */
  lastHitAt:number;lastDownAt:number;
  lastHitRegion:WoundRegion;lastHitYaw:number;
  lastHitSeverity:number;downPose:FallPose;downClearance:number;
  /** Short-lived motor-only forward gaze during an automatic lateral bypass. */
  autoSidestep:AutoSidestep|null;
  /** Temporary cooperative sidestep, independent of authored orders. */
  yieldTarget:Pt|null;yieldFor:string|null;yieldUntil:number;
  personality:Personality;morale:number;lastNoiseAt:number;
  postureChangedAt?:number;
  encounterActivity?:EncounterActivity;encounterReadiness?:EncounterReadiness;
  encounterRole?:EncounterRole;encounterGroupId?:string;
  encounterRoutine?:Pt[];routineIndex?:number;routinePauseUntil?:number;
  encounterReactionUntil?:number;encounterReactionStartedAt?:number;
  lastNoiseExaminedAt:number;lastNoiseExaminedId:number;
  flashUntil:number;lastThrowAt:number;lastDoorAt:number;
  lastDoorId:string|null;lastDoorMethod:DoorMethod;
  stride:number;weapon:WeaponId;injuryStage:number;
  weaponYaw:number;stability:number;recoil:number;lastShotAt:number;
  lastBashAt:number;lastBashRole:'push'|'receive'|null;
  /** Bounded, idle-only clearer gaze; never an authored aim or detection. */
  clearLookBearing?:number|null;lastClearLookProbeAt?:number;
  /** Brief physical interruption after a door leaf impact, not a wound. */
  doorStunUntil?:number;
  lastLaneWarnAt:number;lastFireBlock:FireBlock;
  /** Transient, collision-checked gun-clearance recovery; not a PlanNode. */
  fireRetreatTarget:Pt|null;fireRetreatUntil:number;lastFireRetreatAt:number;
  fireMode:FiringMode;burstCount:number;skills:ShootingSkills;
  appearanceSeed:number;equipment?:EquipmentLoadout;
  wardrobe?:WardrobeOptions;
  weaponConfiguration?:WeaponConfiguration;
  weaponLightOn:boolean;
  loadMovementScale?:number;
  armorIntegrity:number;helmetIntegrity:number;
  flashCharges:number;
  firePolicy:FirePolicy;suppressPoint:Pt|null;focusTargetId:string|null;
  defense:Pt|null;watch:Pt|null;defenseUntil:number;surrendered:boolean;
  lastFireRepositionAt:number;lastMissionEvadeAt:number;
  lastEnemyDoorCloseAt:number;
};
export type NoiseEvent={id?:number;p:Pt;radius:number;time:number;kind:string};
export type ShotEvent={
  id:number;shooterId:string;targetId:string|null;
  start:Pt;end:Pt;age:number;hit:boolean;side:Side;
  healthBefore:number;healthAfter:number;down:boolean;
  shotYaw?:number;mode?:FiringMode;spread?:number;
  muzzleHeight?:number;firedAt?:number;
  impactHeight?:number;
  hitRegion?:WoundRegion;downPose?:FallPose;
  surface?:'blood'|'wood'|'stone'|'metal'|'glass'|'dust';
};
export type ImpactMark={id:number;p:Pt;surface:ShotEvent['surface'];age:number;
  height?:number;normal?:Pt};
export type DroppedMagazine={id:number;p:Pt;side:Side;age:number;
  weapon?:WeaponId;rounds?:number;magazineId?:string};
export type FlashGrenade={id:number;p:Pt;from:Pt;to:Pt;age:number;
  fuse:number;path?:ThrowPath};
export type FlashBurst={id:number;p:Pt;age:number};
export type KnownContact={p:Pt;at:number;status:'seen'|'heard'};
export type MissionStage='clear'|'secure'|'extract'|'done';
export type Scenario={index:number;name:string;objective:Pt;extract:Pt};
/** One committed squad-entry command is one undoable team edit. */
export type SquadPlanTransaction={
 members:string[];
 before:Record<string,PlanNode[]>;
 after:Record<string,PlanNode[]>;
 controlsBefore?:Record<string,PlanControlSnapshot>;
 controlsAfter?:Record<string,PlanControlSnapshot>;
 undoDepth?:Record<string,number>;
};
export type Session=Omit<TacticalState,'operators'> & {
  operators:TeamActor[];civilians:CivilianActor[];
  civilianHarmEvents:CivilianHarmEvent[];
  windows:WindowState[];objectRevision:number;
  coverState:typeof COVER;
  passageLeases:Record<string,PassageLease>;
  squadEntryUndo:SquadPlanTransaction|null;
  squadEntryRedo:SquadPlanTransaction|null;
  variant:number;scenario:Scenario;
  mission:MissionStage;nextId:number;noise:NoiseEvent[];nextNoiseId:number;
  reports:TacticalReport[];nextReportId:number;
  shots:ShotEvent[];casings:EjectedCasing[];nextShotId:number;
  known:Map<string,KnownContact>;
  seenGround:Set<string>;seenGroundRevision:number;
  intel:IntelState;intelObservedAt:number;
  timesPaused:number;deaths:number;
  started:boolean;syncCode:number;report:string[];
  movementNoiseAt:number;site?:Site;lightingMode:LightingMode;dropped:DroppedMagazine[];
  grenades:FlashGrenade[];flashBursts:FlashBurst[];flashRemaining:number;
  nextEffectId:number;impactMarks:ImpactMark[];
  battleEvents:BattleEvent[];nextBattleId:number;
  executionEvents:ExecutionEvent[];nextExecutionId:number;
  missionType:'clear'|'intel'|'rescue'|'hold'|'capture';holdTime:number;
  /** Opt-in narrative artifact, not used by simulation or AI. */
  operationDossier?:OperationDossierV1;
  rescue:RescueEscort|null;
  captureTarget:string|null;captureSecured:boolean;
  intelCarrierId:string|null;};
// The elective enemy-planning budget is mission-local and never serialized.
/** Planning authority for GO-time ordering; never edits PlanNode[].
 * A new GO after a tactical pause recomputes the remaining crossing
 * schedule. The running sequence is stable between those checkpoints. */
const passageSchedules=new WeakMap<Session,PassageSchedule>();
function ensurePassageSchedule(s:Session):PassageSchedule{
 const old=passageSchedules.get(s);
 if(old)return old;
 const schedule=planDoorSchedule(s.operators,s.doors,
   (from,to)=>legalMoveRoute(s,from,to));
 passageSchedules.set(s,schedule);
 return schedule;
}
const tacticalRoutes=new WeakMap<Session,TacticalRouteCache>();
const perceptionBySession=new WeakMap<Session,PerceptionPairCache>();
/** Exact-authority cache: geometry epoch and precise leaf state fully
 * invalidate a physical route. No uncertain player intel is reused here. */
function cachedEnemyRoute(s:Session,from:Pt,to:Pt,physicalDoors=false):Pt[]{
  let cache=tacticalRoutes.get(s);
  if(!cache){cache=new TacticalRouteCache();tacticalRoutes.set(s,cache);}
  const leafSignature=physicalDoors?s.doors.map(door=>[
    door.id,door.kind,door.open,door.openFraction,
    door.hinge,door.swing,door.slideDirection
  ].join(':')).join(';'):'static';
  return cache.get(from,to,sessionWorldGeometry(s).revision,
    Math.round(s.seconds*60),leafSignature,()=>
      physicalDoors?routeWithSqueezeWorld(from,to,s.doors,sessionWorldGeometry(s)):sessionWorldGeometry(s).route(from,to));
}
const d=(a:Pt,b:Pt)=>length(a,b);
const clone=(p:Pt):Pt=>({...p});
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
export const OBJECTIVE:Pt={x:453,y:319};
export const EXTRACTION:Pt={x:307,y:669};
export const SCENARIOS=[
  {index:0,name:'SENTRY',spots:[{x:242,y:301,h:1.58},{x:523,y:254,h:2.48}]},
  {index:1,name:'CROSSWATCH',spots:[{x:228,y:442,h:0.6},{x:518,y:258,h:2.3}]},
  {index:2,name:'REAR GUARD',spots:[{x:262,y:213,h:1.1},{x:476,y:444,h:2.8}]},
] as const;
/** Omitted seed keeps 052's historic static study for regression tests.
 * The actual game passes a unique seed on each newly loaded site.
 */
export function newSession(index=0,siteSeed?:number,
  intelMode:IntelMode='floor-plan',scale:SiteScale='standard',
  missionOverride?:OperationKind,prebuiltSite?:Site,
  encounterContext:EncounterContext={}):Session{
  const site=prebuiltSite??(siteSeed===undefined?undefined:
    generateSite(siteSeed>>>0,scale,undefined,
      {...encounterContext,mission:missionOverride??encounterContext.mission}));
  activateSite(site??null);
  const seed=newTacticalState();
  const variant=((index%SCENARIOS.length)+SCENARIOS.length)%SCENARIOS.length;
  const sample=SCENARIOS[variant];
  const operators=seed.operators.map(withActions);
  if(site){
    // Two more independently commanded operators, not cloned simulations.
    const rook=operators.find(a=>a.id==='rook')!;
    for(const [id,name] of [['ash','ASH'],['vale','VALE']]){
      const base={...rook,id,name,p:{...rook.p},path:[],
        lastSpotted:null,shots:0,fireCd:0,health:2};
      operators.push(withActions(base));
    }
    const friendly=operators.filter(a=>a.side==='blue');
    friendly.forEach((a,i)=>{
      const issue=issueWeaponPreset(starterWeaponPreset(a.id));
       a.weapon=issue.weapon;a.weaponConfiguration=issue.weaponConfiguration;
      const issueRounds=freshMagazineIssue(a.id,a.weapon,a.weaponConfiguration);
      a.magazine=issueRounds.magazine;a.reserve=issueRounds.reserve;
      a.insertedMagazineId=issueRounds.loadedMagazineId;
      a.spareMagazines=issueRounds.magazines;
      a.health=4;a.injuryStage=0;
      a.p={...site.spawn[i]};
      // Entry teams face the nearest actual interior, not a hard-coded
      // compass direction that is wrong for rotated/generated buildings.
      const room=[...site.rooms].sort((u,v)=>
        d(a.p,{x:u.x+u.w/2,y:u.y+u.h/2})-
        d(a.p,{x:v.x+v.w/2,y:v.y+v.h/2}))[0];
      a.heading=room?angle(a.p,{x:room.x+room.w/2,y:room.y+room.h/2}):
        angle(a.p,site.entrance);
      a.weaponYaw=a.heading;
      a.priorP={...a.p};
    });
    // Site danger scales gently with room count; guards never spawn outside
    // their generated rooms, and every corpse uses the actual site geometry.
    const old=operators.filter(a=>a.side==='red');
    const enemyRng=seeded(site.seed^0x8bd7812f);
    for(let i=0;i<site.enemies.length;i++){
      let a:TeamActor;
      if(i<old.length)a=old[i];
      else{
        const source=old[i%old.length];
        a=withActions({...source,id:'guard'+i,
          name:'GUARD '+(i+1),p:{...source.p},path:[],
          lastSpotted:null,shots:0,fireCd:0,health:2});
        operators.push(a);
      }
      a.p={...site.enemies[i]};a.priorP={...a.p};
      a.heading=site.encounter?.actors[i]?.heading??
        site.enemyHeadings?.[i]??enemyRng()*Math.PI*2;
      a.weaponYaw=a.heading;
      const spec=site.encounter?.actors[i];
      if(spec){a.encounterActivity=spec.activity;a.encounterReadiness=spec.readiness;
        a.encounterRole=spec.role;a.encounterGroupId=spec.groupId;
        a.encounterRoutine=spec.routine?.map(p=>({...p}));
        a.routineIndex=0;a.routinePauseUntil=1.5+enemyRng()*3;
        a.encounterReactionUntil=Number.POSITIVE_INFINITY;}
      a.health=enemyRng()<.18?3:4;
      const issued=enemyKitForEncounter(spec,site.seed,i);
      a.weapon=issued.weapon;
      a.weaponConfiguration=issued.weaponConfiguration;
      a.equipment=issued.equipment;a.wardrobe=issued.wardrobe;
      a.appearanceSeed=issued.appearanceSeed;
      a.armorIntegrity=issued.armorIntegrity;
      a.helmetIntegrity=issued.helmetIntegrity;
      const issueRounds=freshMagazineIssue(a.id,a.weapon,a.weaponConfiguration);
      a.magazine=issueRounds.magazine;a.reserve=issueRounds.reserve;
      a.insertedMagazineId=issueRounds.loadedMagazineId;
      a.spareMagazines=issueRounds.magazines;
      a.injuryStage=0;
      a.personality=spec?.role==='investigator'?'aggressor':
        spec?.role==='reserve'||spec?.role==='target'?'cautious':
        (['guard','aggressor','cautious'] as const)[Math.floor(enemyRng()*3)];
      a.morale=.48+enemyRng()*.52;
    }
    // Generated sites may legitimately have one or no armed occupants.
    // Remove unused legacy defenders: no invisible off-map enemies.
    if(site.enemies.length<old.length){
      const unused=new Set(old.slice(site.enemies.length));
      for(let i=operators.length-1;i>=0;i--)
        if(unused.has(operators[i]))operators.splice(i,1);
    }
  }else operators.filter(a=>a.side==='red').forEach((a,i)=>{
    const pos=sample.spots[i];a.p={x:pos.x,y:pos.y};a.heading=pos.h;
    const issued=enemyKitForEncounter(undefined,index,i);
    a.weapon=issued.weapon;a.weaponConfiguration=issued.weaponConfiguration;
    a.equipment=issued.equipment;a.wardrobe=issued.wardrobe;
    a.appearanceSeed=issued.appearanceSeed;
    a.armorIntegrity=issued.armorIntegrity;
    a.helmetIntegrity=issued.helmetIntegrity;
    const issueRounds=freshMagazineIssue(a.id,a.weapon,a.weaponConfiguration);
    a.health=2;a.magazine=issueRounds.magazine;
    a.reserve=issueRounds.reserve;a.weaponYaw=a.heading;
    a.insertedMagazineId=issueRounds.loadedMagazineId;
    a.spareMagazines=issueRounds.magazines;
  });
  // The base tactical study carries two legacy defenders. An explicit
  // training site must remove them rather than spawning hostile AI off-map.
  if(site?.training){
    for(let i=operators.length-1;i>=0;i--)
      if(operators[i].side==='red')operators.splice(i,1);
  }
  // Civilian activation is an explicit session policy. The current UI opts
  // in by default, while old tests/replays and ?civilians=0 stay empty.
  const civilians=encounterContext.enableCivilians?
    (site?.encounter?.neutrals??[]).map(createCivilian):[];
  if(site)for(const person of civilians)
    person.refugePoints=civilianRefugePoints(site,person);
  const state:Session={...seed,operators,civilians,
    civilianHarmEvents:[],objectRevision:0,
    coverState:COVER.map(o=>({...o,material:materialForFixture(o.fixture),
      integrity:MATERIALS[materialForFixture(o.fixture)].integrity})),
    windows:initializeWindows(site?.windows??[]),
    passageLeases:{},squadEntryUndo:null,squadEntryRedo:null,
    doors:initialDoors().map((d,i)=>initDoor({
      ...d,locked:d.locked??!!(site&&i>2&&i%7===0&&
        d.kind!=='shutter'&&d.id!=='FRONT')},i)),variant,nextId:1,
    scenario:{index:variant,name:site?.name??sample.name,
      objective:clone(site?.objective??OBJECTIVE),
      extract:clone(site?.extract??EXTRACTION)},
    mission:'clear',noise:[],nextNoiseId:1,reports:[],nextReportId:1,shots:[],casings:[],nextShotId:1,known:new Map(),
    seenGround:new Set(),seenGroundRevision:0,
    intel:initialIntel(intelMode,site,initialDoors()),
    intelObservedAt:-1,timesPaused:0,deaths:0,started:false,
    syncCode:0,report:[],movementNoiseAt:0,site,lightingMode:'day',
    dropped:[],grenades:[],flashBursts:[],flashRemaining:2,nextEffectId:1,
    impactMarks:[],battleEvents:[],nextBattleId:1,
    executionEvents:[],nextExecutionId:1,
    missionType:missionOverride??(site?(['clear','intel','rescue','hold','capture'] as const)[site.seed%5]:'clear'),
    holdTime:0,rescue:null,captureTarget:null,captureSecured:false,
    intelCarrierId:null};
  if(state.missionType==='capture'){
    // Respect the mission-specific target role from the actual encounter.
    // Fallback to the legacy first defender for older saved/practice maps.
    const targetIndex=site?.encounter?.actors.findIndex(a=>a.role==='target')??-1;
    const fighters=operators.filter(a=>a.side==='red');
    const target=targetIndex>=0?fighters[targetIndex]:fighters[0];
    state.captureTarget=target?.id??null;
    if(target)state.scenario.objective=clone(target.p);
  }
  if(state.missionType==='rescue'){
    // The developer-gated migration creates ONE authoritative rescued
    // person. Ordinary gameplay keeps the legacy escort until N4 release.
    if(encounterContext.enableCivilians&&site){
      const point=state.scenario.objective;
      const room=site.rooms.find(r=>r.kind==='room'&&
        point.x>=r.x&&point.x<=r.x+r.w&&
        point.y>=r.y&&point.y<=r.y+r.h);
      state.civilians.push(createCivilian({
        id:'civ:rescue:'+site.seed,role:'rescue',persona:'cautious',
        activity:'waiting',position:clone(point),heading:0,
        roomId:room?.id??'objective',
        zoneId:room?.zoneId??room?.id,
        appearanceSeed:site.seed^0x57eb,
        isRescueTarget:true
      }));
    }
    state.rescue={p:clone(state.scenario.objective),following:null,trail:[]};
  }
  if(state.missionType==='intel'||state.missionType==='rescue'||
     state.missionType==='hold')state.mission='secure';
  COVER.splice(0,COVER.length,...state.coverState);
  registerSessionWorldGeometry(state);
  setPresentationWorldSession(state);
  bindIntelWorld(state.intel,sessionWorldGeometry(state));
  observe(state);
  return state;
}
/** Changes starting position only before gameplay and before authored routes.
 * Reset remembered fog: the default front must not remain pre-revealed.
 */
export function availableDeployments(s:Session):DeploymentChoice[]{
 return s.site?verifiedDeploymentChoices(s.site,sessionWorldGeometry(s)):[];
}
export function selectDeployment(s:Session,id:string):boolean{
 if(!s.site||s.started||s.phase!=='planning'||team(s).some(a=>a.plan.length))
  return false;
 const choice=id==='FRONT'?null:availableDeployments(s).find(c=>c.id===id);
 if(id!=='FRONT'&&!choice)return false;
 const positions=choice?.spots??s.site.spawn;
 if(positions.length<team(s).length||!team(s).every((_,i)=>sessionWorldGeometry(s).passable(positions[i],8)))
  return false;
 team(s).forEach((a,i)=>{
  a.p=clone(positions[i]);a.priorP=clone(positions[i]);
  a.plan=[];a.history=makeHistory();a.nav=[];a.path=[];
  a.heading=angle(a.p,choice?.approach??s.site!.entrance);
  a.weaponYaw=a.heading;
 });
 s.intel=initialIntel(s.intel.mode,s.site,s.doors,sessionWorldGeometry(s));
 bindIntelWorld(s.intel,sessionWorldGeometry(s));
 s.seenGround.clear();s.seenGroundRevision++;s.known.clear();
 s.squadEntryUndo=null;s.squadEntryRedo=null;
 observe(s);
 notify(s,'DEPLOYMENT SET — '+(choice?.id??'FRONT'));
 return true;
}
export const team=(s:Session)=>s.operators.filter(a=>a.side==='blue');
export const enemies=(s:Session)=>s.operators.filter(a=>a.side==='red');
export const actor=(s:Session,id:string)=>s.operators.find(a=>a.id===id);
const party=(s:Session,id:string)=>team(s).find(a=>a.id===id&&a.health>0);
export const canEdit=(s:Session)=>s.phase==='planning';
/** Plan authoring can see only briefed/discovered surfaces. World-truth
 * validation runs again at execution; hidden furniture isn't exposed by
 * an unexplained path preview or a shortcut through a closed window.
 */
function knownWindowWorld(s:Session){
 const cover=s.coverState.filter((_,i)=>s.intel.cover.has(i));
 return {
  cover,walls:sessionWorldGeometry(s).walls.filter((_,i)=>s.intel.walls.has(i)),
  doors:s.doors.filter(door=>doorKnown(s.intel,door.id)),
  windows:s.windows.filter(w=>s.intel.cover.has(s.coverState.findIndex(o=>
    (o.fixture==='window-sill'||o.fixture==='glass-barrier')&&
    Math.hypot(o.x-w.x,o.y-w.y)<1))).map(w=>
      canOpenWindowForClimb(w)?{...w,open:true}:w),
  canStand:(at:Pt)=>intelPassable(at,s.intel)
 };
}
/** Preview only known, reachable window portals; never infer hidden rooms. */
export function plannedWindowRoute(s:Session,from:Pt,to:Pt,
 ordinary:readonly Pt[]=routeWithSqueezeIntel(s.intel,from,to)):Pt[]|null{
 const world=knownWindowWorld(s);
 if(!world.windows.length)return null;
 const portal=probeWindowPortalRoute(from,to,world,
   (a,b)=>routeWithSqueezeIntel(s.intel,a,b));
 if(!portal||ordinary.length&&portal.duration+.12>=
   traversalRouteLength(from,ordinary)/53)return null;
 return [...portal.approachPath,portal.crossing.landing,...portal.exitPath];
}
/** An explicit straight gesture through ONE known light object may remain
 * authored. Other blocked samples (walls, unknown cover, doors) still reject.
 * The motor must physically reach and shove the same known object later. */
function knownShoveCrossing(s:Session,from:Pt,to:Pt):number|null{
 if(!intelPassable(from,s.intel,SQUEEZE_RADIUS)||
    !intelPassable(to,s.intel,SQUEEZE_RADIUS))return null;
 const span=d(from,to);
 if(span<3)return null;
 // A shove cannot be used to disguise an ordinary known wall or a latched
 // door, even when its sample is inside the expanded furniture envelope.
 const segment={a:from,b:to};
 if(sessionWorldGeometry(s).walls.some((wall,index)=>s.intel.walls.has(index)&&
    segmentsCross(segment,wall)))return null;
 if(s.doors.some(door=>doorKnown(s.intel,door.id)&&
    doorBlocksSegment(door,segment)))return null;
 for(let index=0;index<s.coverState.length;index++){
   const obstacle=s.coverState[index];
   if(!s.intel.cover.has(index)||!canAutoShove(obstacle)||
      !canRelocateCover(obstacle)||
      !segmentHitsBox(from,to,{...obstacle,
        w:obstacle.w+2,h:obstacle.h+2}))continue;
   const allowance={...obstacle,
     w:obstacle.w+SQUEEZE_RADIUS*2+4,
     h:obstacle.h+SQUEEZE_RADIUS*2+4};
   let otherObstruction=false;
   for(let i=1,n=Math.ceil(span/4);i<n;i++){
     const t=i/n,p={x:from.x+(to.x-from.x)*t,
       y:from.y+(to.y-from.y)*t};
     if(!intelPassable(p,s.intel,SQUEEZE_RADIUS)&&
        !segmentHitsBox(p,p,allowance)){
       otherObstruction=true;break;
     }
   }
   if(!otherObstruction)return index;
 }
 return null;
}
function knownTraversal(s:Session,from:Pt,to:Pt):boolean{
 const world=knownWindowWorld(s);
 return knownShoveCrossing(s,from,to)!==null||
   !!probeObstacleCrossing(from,to,world)||
   !!probeWindowPortalRoute(from,to,world,
     (a,b)=>routeWithSqueezeIntel(s.intel,a,b));
}
const legalMoveRoute=(s:Session,from:Pt,to:Pt):Pt[]=>{
 const ordinary=routeWithSqueezeIntel(s.intel,from,to);
 return plannedWindowRoute(s,from,to,ordinary)??(
   ordinary.length?ordinary:knownTraversal(s,from,to)?[to]:[]);
};

/** A short, already-routable gesture may use a nearby KNOWN real portal.
 * Serving windows retain their authoritative solid sill collision.
 */
function knownPortalGesture(s:Session,from:Pt,to:Pt,blocked:Pt):boolean{
 if(!intelPassable(to,s.intel,SQUEEZE_RADIUS))return false;
 const portals=[
   ...s.doors.filter(door=>doorKnown(s.intel,door.id))
     .map(door=>({a:door.a,b:door.b})),
   ...(s.site?.openings??[]).filter(opening=>
     opening.kind!=='serving'&&
     (s.intel.mode==='floor-plan'||s.intel.mode==='full-view'||
       liveVisibility(s,{x:(opening.a.x+opening.b.x)/2,
         y:(opening.a.y+opening.b.y)/2})))
     .map(opening=>({a:opening.a,b:opening.b})),
 ];
 if(!portals.some(portal=>pointToSegment(blocked,portal)<=18))return false;
 return knownPortalStrokeRoute(from,to,blocked,portals,
   legalMoveRoute(s,from,to));
}
export const finalPoint=(a:TeamActor)=>lastPoint(a.p,a.plan);
export function addNode(s:Session,id:string,kind:PlanKind,p:Pt,
  extra:Partial<PlanNode>={}):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  if(kind==='move'&&!intelPassable(p,s.intel,SQUEEZE_RADIUS))return false;
  if(kind==='move'&&!legalMoveRoute(s,finalPoint(a),p).length)return false;
  if(kind==='door'&&(!extra.doorId||!doorKnown(s.intel,extra.doorId)||
    !intelPassable(p,s.intel,SQUEEZE_RADIUS)||
    !routeWithSqueezeIntel(s.intel,finalPoint(a),p).length))return false;
  return edit(s,a,()=>{
    a.plan.push({id:s.nextId++,kind,p:clone(p),...extra});
  });
}
/** Queue a physical fixture interaction at the route end or selected waypoint.
 * Using the selected waypoint's world position avoids context buttons that
 * appear available but target the unrelated final route endpoint. */
export function planNearbyInteraction(s:Session,id:string,
 action:'push'|'open-window'|'close-window',afterNodeId?:number,
 pushPoint?:Pt):boolean{
 const a=party(s,id);if(!a||!canEdit(s))return false;
 const insertion=afterNodeId===undefined?-1:
   a.plan.findIndex(n=>n.id===afterNodeId);
 if(afterNodeId!==undefined&&insertion<0)return false;
 const at=insertion>=0?a.plan[insertion].p:finalPoint(a);
 const queue=(objectId:string,pushDirection?:Pt)=>edit(s,a,()=>{
   const order:PlanNode={id:s.nextId++,kind:'interact',p:clone(at),
     objectId,interaction:action,pushDirection};
   if(insertion>=0)a.plan.splice(insertion+1,0,order);
   else a.plan.push(order);
 });
 if(action==='push'){
   const candidates=s.coverState.map((o,index)=>({o,index,
     distance:d(at,{x:o.x,y:o.y})})).filter(c=>
       s.intel.cover.has(c.index)&&canRelocateCover(c.o)&&
       c.distance<Math.max(c.o.w,c.o.h)/2+43)
     .sort((x,y)=>x.distance-y.distance||x.index-y.index);
   const item=candidates[0];if(!item)return false;
   const toward={x:item.o.x-at.x,y:item.o.y-at.y};
   const base=Math.atan2(toward.y,toward.x);
   const chosen=pushPoint&&d(pushPoint,{x:item.o.x,y:item.o.y})>4?
     Math.atan2(pushPoint.y-item.o.y,pushPoint.x-item.o.x):base;
   const delta=angleDifference(base,chosen);
   const yaw=base+clamp(delta,-Math.PI*4/9,Math.PI*4/9);
   return queue('prop:'+item.index,{x:Math.cos(yaw),y:Math.sin(yaw)});
 }
 const target=s.windows.filter(w=>w.operable&&!w.shattered&&
   d(at,{x:w.x,y:w.y})<54&&w.open===(action==='close-window'))
   .sort((x,y)=>d(at,{x:x.x,y:x.y})-
     d(at,{x:y.x,y:y.y}))[0];
 if(!target)return false;
 return queue('window:'+target.id);
}
/** Explicit authored civilian interaction: no distant or fog-granted
 * command. The target's current physical position is rechecked on GO. */
export function planCivilianInteraction(s:Session,id:string,
 civilianId:string,action:'secure'|'follow'):boolean{
 const a=party(s,id),civil=s.civilians.find(c=>c.id===civilianId);
 if(!a||!civil||!canEdit(s)||civil.health<=0||
    !liveVisibility(s,civil.p))return false;
 const from=finalPoint(a);
 if(d(from,civil.p)>34||
    !sweptBodyClear(from,civil.p,s.doors,5.5,sessionWorldGeometry(s)))return false;
 if(action==='follow'&&(!civil.rescueTarget||s.mission!=='extract'))
   return false;
 return addNode(s,id,'interact',from,{
   objectId:civil.id,interaction:action==='secure'?
     'secure-civilian':'follow-civilian'
 });
}
export function planMove(s:Session,id:string,p:Pt,strafe=false){
  const a=party(s,id);
  if(!a)return false;
  const extra=strafe?{moveMode:'strafe' as const,
    facing:[...a.plan].reverse().find(n=>n.facing!==undefined)?.facing??a.heading}:{};
  const target=projectReachableGoal(finalPoint(a),p,{
    canStand:at=>intelPassable(at,s.intel,SQUEEZE_RADIUS),
    routeTo:(from,to)=>legalMoveRoute(s,from,to),
  });
  if(!target)return false;
  if(target.adjusted)notify(s,'POSITION ADJUSTED TO WALKABLE GROUND');
  return addNode(s,id,'move',target.point,extra);
}
/** A finger-drawn path is one undoable gesture, while BACK removes one node.
 * An obstructed drag ends at its last known safe point, never across the
 * obstacle and never by exposing geometry still hidden from the player. */
export type StrokeOutcome={clipped:boolean;endpoint:Pt};
export function planMoveStroke(s:Session,id:string,points:Pt[],
 strafe=false,replaceExisting=false,outcome?:StrokeOutcome){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  // HERE redraw replaces navigation, not sustained WATCH intent. A WATCH
  // attached to an old MOVE waypoint becomes an independent HERE instruction,
  // retaining its original ID and world-space target for editing/deletion.
  // A subsequent explicit LOOK/RELEASE already supersedes that WATCH.
  const latestAim=replaceExisting?[...a.plan].reverse().find(n=>
    n.aimMode!==undefined||n.facing!==undefined):undefined;
  const retainedWatch:PlanNode|null=latestAim?.aimMode==='track'&&
    latestAim.aimPoint?{
      id:latestAim.id,kind:'look',p:clone(a.p),aimMode:'track',
      aimPoint:clone(latestAim.aimPoint),aimLabel:'watch'
    }:null;
  // An already-executed WATCH lives in a.aimInstruction, not the plan;
  // editing the route must not modify it either.
  const proposed:PlanNode[]=[];
  let from=replaceExisting?a.p:finalPoint(a);
  const facing=replaceExisting?a.heading:
    [...a.plan].reverse().find(n=>n.facing!==undefined)?.facing??a.heading;
  // Test the *drawn segments*, not just their endpoints. A route search
  // could otherwise detour around a wall even though the finger crossed it.
  // Use KNOWN clearance only: undiscovered walls/props must not leak.
  // Window/mantle portals remain legal when the established traversal system
  // explicitly permits them.
  const stroke=points.length>60?[...points.slice(0,59),points.at(-1)!]:points;
  const addStrokePoint=(point:Pt):boolean=>{
    if(d(from,point)<3||!legalMoveRoute(s,from,point).length)return false;
    proposed.push({id:s.nextId+proposed.length,kind:'move',p:clone(point),
      ...(strafe?{moveMode:'strafe' as const,facing}:{})});
    from=point;
    return true;
  };
  let previousInput=from,clipped=false;
  for(let i=0;i<stroke.length;i++){
    const point=stroke[i],last=i===stroke.length-1;
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y)){
      clipped=true;break;
    }
    if(!last&&!intelPassable(point,s.intel,SQUEEZE_RADIUS)&&
       intelPassable(stroke[stroke.length-1],s.intel,SQUEEZE_RADIUS)&&
       knownTraversal(s,previousInput,stroke[stroke.length-1]))continue;
    const span=d(previousInput,point);
    const steps=Math.max(1,Math.ceil(span/3));
    let lastClear=previousInput,firstBlocked:Pt|null=null;
    for(let step=1;step<=steps;step++){
      const fraction=step/steps;
      const p={x:previousInput.x+(point.x-previousInput.x)*fraction,
        y:previousInput.y+(point.y-previousInput.y)*fraction};
      if(!intelPassable(p,s.intel,SQUEEZE_RADIUS)){
        firstBlocked=p;break;
      }
      lastClear=p;
    }
    // A real, known window portal is not a solid wall. Do not trim a
    // deliberate vault/window crossing that the movement planner supports.
    if(firstBlocked&&(
       (knownTraversal(s,previousInput,point)&&
         legalMoveRoute(s,previousInput,point).length)||
       knownPortalGesture(s,previousInput,point,firstBlocked)))
      firstBlocked=null;
    if(firstBlocked){
      // Refine the first collision to near the clearance boundary without
      // ever placing a waypoint inside the wall or piece of furniture.
      let safe=lastClear,blocked=firstBlocked;
      for(let j=0;j<6;j++){
        const mid={x:(safe.x+blocked.x)/2,y:(safe.y+blocked.y)/2};
        if(intelPassable(mid,s.intel,SQUEEZE_RADIUS))safe=mid;
        else blocked=mid;
      }
      // Clearance alone is insufficient if the routing grid cannot land
      // exactly at this edge. Search backward for the furthest *routable*
      // point along the same safe approach, without crossing the obstacle.
      if(!legalMoveRoute(s,from,safe).length){
        let reachable=from,limit=safe;
        for(let j=0;j<7;j++){
          const mid={x:(reachable.x+limit.x)/2,
            y:(reachable.y+limit.y)/2};
          if(intelPassable(mid,s.intel,SQUEEZE_RADIUS)&&
             legalMoveRoute(s,from,mid).length)reachable=mid;
          else limit=mid;
        }
        safe=reachable;
      }
      addStrokePoint(safe);
      clipped=true;break;
    }
    previousInput=point;
    if(d(from,point)<(last?3:20))continue;
    if(!addStrokePoint(point)){
      // A non-local pathfinding failure must not discard earlier accepted
      // bends or silently jump to the other side of an obstruction.
      clipped=true;break;
    }
  }
  if(!proposed.length)return false;
  // Door actions inserted during one stroke remain one undoable edit.
  const expanded:PlanNode[]=[];let prior=replaceExisting?a.p:finalPoint(a);
  const opened=new Set((replaceExisting?[]:a.plan).filter(n=>
    n.kind==='door'&&(n.method==='open'||n.method==='kick'))
    .map(n=>n.doorId??''));
  for(const node of proposed){
    const points=[prior,...routeWithIntel(s.intel,prior,node.p)];
    for(let i=1;i<points.length;i++)
      for(const door of s.doors){
        if(!doorKnown(s.intel,door.id)||
           (s.intel.doorMemory.get(door.id)??0)>=.72||
           opened.has(door.id)||
           !segmentsCross({a:points[i-1],b:points[i]},door)&&
           pointToSegment(doorCenter(door),
             {a:points[i-1],b:points[i]})>9&&
           pointToSegment(doorCenter(door),
             {a:prior,b:node.p})>9)continue;
        const staging=knownDoorApproach(s,prior,door);
        if(!staging)continue;
        expanded.push({id:s.nextId+expanded.length,kind:'door',
          p:clone(staging),doorId:door.id,method:'open'});
        opened.add(door.id);
      }
    expanded.push({...node,id:s.nextId+expanded.length});
    prior=node.p;
  }
  // The entire replacement stroke (including implicit door actions) is
  // ONE undoable transaction. A rejected stroke leaves the old route intact.
  const codes=new Set(replaceExisting?
    a.plan.filter(n=>n.kind==='sync'&&n.syncCode).map(n=>n.syncCode!):[]);
  return editRemovingSync(s,a,codes,()=>edit(s,a,()=>{
    if(replaceExisting)a.plan=retainedWatch?[retainedWatch,...expanded]:expanded;
    else a.plan.push(...expanded);
    s.nextId+=expanded.length;
    if(outcome){
      outcome.clipped=clipped;
      outcome.endpoint=clone(expanded.at(-1)!.p);
    }
  }));
}
export function setStrafe(s:Session,id:string,nodeId:number):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=a.plan.find(n=>n.id===nodeId);
  if(!node||node.kind!=='move')return false;
  return edit(s,a,()=>{
    if(node.moveMode==='strafe'){
      node.moveMode='advance';
    }else{
      node.moveMode='strafe';
      node.facing??=[...a.plan.slice(0,a.plan.indexOf(node))]
        .reverse().find(n=>n.facing!==undefined)?.facing??a.heading;
    }
  });
}
/** Removal of a coordinated SYNC is itself a team transaction.
 * Other participants never retain a stranded wait when HERE redraw,
 * DELETE, CLEAR or BACK removes the link. */
function editRemovingSync(s:Session,a:TeamActor,codes:Set<string>,
 change:()=>boolean):boolean{
 const linked=team(s).filter(peer=>peer!==a&&peer.health>0&&
   peer.plan.some(n=>n.kind==='sync'&&!!n.syncCode&&codes.has(n.syncCode)));
 if(!linked.length)return change();
 return atomicTeamEdit(s,[a,...linked],()=>{
  if(!change())return false;
  for(const peer of linked)
   if(!edit(s,peer,()=>{
    peer.plan=peer.plan.filter(n=>
      n.kind!=='sync'||!n.syncCode||!codes.has(n.syncCode));
   }))return false;
  return true;
 });
}
/** BACK removes one last instruction and its coordinated SYNC link. */
export function backOne(s:Session,id:string){
 const a=party(s,id);
 if(!a||!canEdit(s)||!a.plan.length)return false;
 const tail=a.plan.at(-1)!;
 const codes=new Set(tail.kind==='sync'&&tail.syncCode?[tail.syncCode]:[]);
 return editRemovingSync(s,a,codes,()=>edit(s,a,()=>{a.plan.pop();}));
}
/** The player chooses a world-space pivot; doors are no longer special. */
export function planPieAt(s:Session,id:string,pivot:Pt,side:PieSide,degrees=54,
  afterNodeId?:number){
  const a=party(s,id);
  if(!a||!canEdit(s))return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<=0&&afterNodeId!==undefined)return false;
  const start=index===0?a.p:a.plan[index-1].p;
  const arc=validKnownPieArc(s,start,pivot,side,degrees);
  if(!arc.length)return false;
  if(afterNodeId===undefined)return addNode(s,id,'pie',arc[arc.length-1],{
    pivot:clone(pivot),pieSide:side,pieDegrees:degrees,arc:arc.map(clone)});
  const proposed=copyNodes(a.plan);
  proposed.splice(index,0,{id:s.nextId,kind:'pie',p:clone(arc.at(-1)!),
    pivot:clone(pivot),pieSide:side,pieDegrees:degrees,arc:arc.map(clone)});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
/** Retain compatibility with Build 063's doorway shortcut. */
export function planPie(s:Session,id:string,doorId:string,side:PieSide){
  const door=s.doors.find(d=>d.id===doorId);
  return !!door&&planPieAt(s,id,doorCenter(door),side);
}
/** Move a pivot or adjust the arc sweep, retaining one undoable order. */
export function editPie(s:Session,id:string,nodeId:number,
  pivot:Pt,degrees?:number,side?:PieSide){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed=copyNodes(a.plan),index=proposed.findIndex(n=>n.id===nodeId);
  if(index<0||proposed[index].kind!=='pie')return false;
  proposed[index].pivot=clone(pivot);
  if(degrees!==undefined)proposed[index].pieDegrees=clamp(degrees,8,120);
  if(side)proposed[index].pieSide=side;
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;});
}
/** Context-aware door action at a selected planned position. */
export function doorAtNode(s:Session,id:string,doorId:string,method:DoorMethod,nodeId?:number){
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s)||!doorKnown(s.intel,doorId))return false;
  if(nodeId===undefined){
    if(!doorReachable(finalPoint(a),door))return planDoor(s,id,doorId,method);
    return addNode(s,id,'door',finalPoint(a),{doorId,method});
  }
  const index=a.plan.findIndex(n=>n.id===nodeId);
  if(index<0||!doorReachable(a.plan[index].p,door))return false;
  const position=clone(a.plan[index].p);
  return edit(s,a,()=>{
    a.plan.splice(index+1,0,{id:s.nextId++,kind:'door',
      p:position,doorId,method});
  });
}

export function movePlanNode(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed=copyNodes(a.plan);
  const index=proposed.findIndex(n=>n.id===nodeId);
  if(index<0)return false;
  const changed=proposed[index];
  if(changed.kind==='pie')return false;
  let point=p;
  if(changed.kind==='move'){
    const from=index>0?proposed[index-1].p:a.p;
    const target=projectReachableGoal(from,p,{
      canStand:at=>intelPassable(at,s.intel,SQUEEZE_RADIUS),
      routeTo:(origin,goal)=>routeWithSqueezeIntel(s.intel,origin,goal),
    });
    if(!target)return false;
    point=target.point;
  }
  if(!modifyNode(proposed,nodeId,{p:point}))return false;
  if(changed.kind==='door'){
    const doorway=s.doors.find(door=>door.id===changed.doorId);
    if(!doorway||!intelPassable(point,s.intel)||
      d(point,doorCenter(doorway))>43)return false;
  }
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;});
}
export function deletePlanNode(s:Session,id:string,nodeId:number){
 const a=party(s,id);if(!a||!canEdit(s))return false;
 const index=a.plan.findIndex(n=>n.id===nodeId);
 if(index<0)return false;
 const removed=a.plan[index];
 const proposed=copyNodes(a.plan);proposed.splice(index,1);
 if(!validEditedPlan(s,a.p,proposed))return false;
 const codes=new Set(removed.kind==='sync'&&removed.syncCode?[removed.syncCode]:[]);
 return editRemovingSync(s,a,codes,()=>edit(s,a,()=>{a.plan=proposed;}));
}
export function insertPlanNode(s:Session,id:string,index:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const position=clamp(index,0,a.plan.length);
  const from=position>0?a.plan[position-1].p:a.p;
  const target=projectReachableGoal(from,p,{
    canStand:at=>intelPassable(at,s.intel),
    routeTo:(origin,goal)=>routeWithIntel(s.intel,origin,goal),
  });
  if(!target)return false;
  const proposed=copyNodes(a.plan);
  proposed.splice(position,0,{id:s.nextId,kind:'move',p:clone(target.point)});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
/**
 * An aim instruction is an order, not a movement geometry.
 * Fixed holds one world heading; track continuously faces a fixed world point.
 * A selected waypoint applies its instruction on arrival, then all subsequent
 * walking inherits it until another aim instruction explicitly overrides it.
 */
export function planAim(s:Session,id:string,mode:AimMode,target:Pt,nodeId?:number,
  label:'look'|'watch'|'strafe'|'pie'=mode==='track'?'watch':'look',
  origin:'end'|'here'='end'){
  const a=party(s,id);
  if(!a||!canEdit(s)||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  const pos=node?.p??(origin==='here'?a.p:finalPoint(a));
  if(d(pos,target)<2)return false;
  const patch:Partial<PlanNode>=mode==='track'?
    {aimMode:'track',facing:undefined,aimPoint:clone(target),aimLabel:label}:
    {aimMode:mode,facing:angle(pos,target),aimPoint:undefined,aimLabel:label};
  if(node)return edit(s,a,()=>{
    node.aimMode=patch.aimMode;node.facing=patch.facing;
    node.aimPoint=patch.aimPoint;node.aimLabel=patch.aimLabel;
  });
  if(origin==='here')return edit(s,a,()=>{
    a.plan.unshift({id:s.nextId++,kind:'look',p:clone(a.p),...patch});
  });
  return addNode(s,id,'look',pos,patch);
}
export function updatePlanFacing(s:Session,id:string,nodeId:number,p:Pt){
  return planAim(s,id,'fixed',p,nodeId);
}
export function planLook(s:Session,id:string,p:Pt,nodeId?:number){
  const a=party(s,id);if(!a)return false;
  const node=nodeId!==undefined?a.plan.find(n=>n.id===nodeId):a.plan.at(-1);
  return planAim(s,id,'free',p,node?.id,'look');
}
/** A WATCH target is world-fixed; heading follows it during movement. */
export function planWatch(s:Session,id:string,p:Pt,nodeId?:number,
  origin:'here'|'end'='end'){
  return planAim(s,id,'track',p,nodeId,'watch',origin);
}
/** Edit the active, already-executed WATCH while paused. Its original
 * order has left the route, so this changes persistent aim state directly
 * without inventing an extra movement waypoint or changing future orders.
 */
export function retargetActiveWatch(s:Session,id:string,target:Pt):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s)||a.aimInstruction?.mode!=='track'||
     !Number.isFinite(target.x)||!Number.isFinite(target.y)||
     d(a.p,target)<2)return false;
  return edit(s,a,()=>{a.aimInstruction={mode:'track',point:clone(target)};});
}
/** DELETE on an active WATCH releases tracking; the path stays untouched. */
export function removeActiveWatch(s:Session,id:string):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s)||a.aimInstruction?.mode!=='track')return false;
  return edit(s,a,()=>{a.aimInstruction=null;});
}
/** Release an existing WATCH using an explicit AUTO transition. */
export function releaseWatch(s:Session,id:string,nodeId?:number,
  origin:'here'|'end'='here'):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  if(node)return edit(s,a,()=>{
    node.aimMode='free';node.aimPoint=undefined;
    node.facing=undefined;node.aimLabel=undefined;
  });
  const pos=origin==='here'?a.p:finalPoint(a);
  return edit(s,a,()=>{
    const entry:PlanNode={id:s.nextId++,kind:'look',p:clone(pos),aimMode:'free'};
    if(origin==='here')a.plan.unshift(entry);
    else a.plan.push(entry);
  });
}
/** A paired entrance is one user interaction but two collision leaves. */
function pairedLeaves(s:Session,door:Door):Door[]{
 const pair=door.pairedWith?s.doors.find(d=>d.id===door.pairedWith):undefined;
 return pair?[door,pair]:[door];
}
/** Specialized entry equipment uses the existing door reach/plan system. */
export function planEntryTool(s:Session,id:string,doorId:string,
 method:EntryTool,nodeId?:number):boolean{
 const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
 if(!a||!door||!canEdit(s)||!doorKnown(s.intel,doorId)||
  !canUseEntryTool(a.equipment,method)||
  !entryToolVerdict(door,method).allowed||
  (method==='wedge'&&a.wedgeRemaining<1))return false;
 if(nodeId!==undefined){
  const index=a.plan.findIndex(n=>n.id===nodeId);
  if(index<0||!doorReachable(a.plan[index].p,door))return false;
  return edit(s,a,()=>{a.plan.splice(index+1,0,{
   id:s.nextId++,kind:'tool',doorId,toolMethod:method,
   p:clone(a.plan[index].p)});});
 }
 const position=knownDoorApproach(s,finalPoint(a),door);
 if(!position)return false;
 return addNode(s,id,'tool',position,{doorId,toolMethod:method});
}
export function planDoor(s:Session,id:string,doorId:string,method:DoorMethod){
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s)||!doorKnown(s.intel,doorId))return false;
  const position=knownDoorApproach(s,finalPoint(a),door);
  return !!position&&addNode(s,id,'door',position,{doorId,method});
}
/** Plan an actual reserved stack position on the same approach side.
 * Four positions are spaced along the door frame, with a second rank.
 */
export function planStack(s:Session,id:string,doorId:string,afterNodeId?:number){
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s)||!doorKnown(s.intel,doorId))return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<=0&&afterNodeId!==undefined)return false;
  const from=index===0?a.p:a.plan[index-1].p,center=doorCenter(door);
  const assigned=team(s).filter(b=>b!==a&&b.health>0)
    .map(b=>b.plan.find(n=>n.stackDoorId===doorId))
    .filter((n):n is PlanNode=>!!n);
  const occupied=assigned.map(n=>n.p);
  // All four slots must remain within the 43-unit door-use radius.
  // The first two take opposite sides of the frame; the next two fill in
  // behind the opening. This prevents two-person legacy stack regressions.
  const preferred=team(s).findIndex(b=>b.id===id);
  const candidates=stackApproachPositions(door,from);
  // Smaller entrance frames retain valid nearby choices; never pick a
  // physical stack slot too far away to use the door.
  const legal=candidates.filter(p=>
    d(p,center)<43&&intelPassable(p,s.intel)&&
    !!routeWithIntel(s.intel,from,p).length&&
    occupied.every(other=>d(p,other)>23));
  legal.sort((u,v)=>{
    const rank=(p:Pt)=>{
      const i=candidates.findIndex(candidate=>d(candidate,p)<1);
      return (i-preferred+4)%4;
    };
    return rank(u)-rank(v)||d(from,u)-d(from,v);
  });
  if(!legal.length)return false;
  const point=legal[0],proposed=copyNodes(a.plan);
  proposed.splice(index,0,{id:s.nextId,kind:'move',p:clone(point),
    moveMode:'strafe',facing:angle(point,center),
    aimMode:'track',aimPoint:clone(center),aimLabel:'pie',
    stackDoorId:doorId});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
/** One tap queues four distinct doorway positions. Existing orders are
 * retained; a failed actor allocation leaves the completed positions intact
 * so players can adjust a tight site individually.
 */
export function planStackTeam(s:Session,doorId:string){
 if(!canEdit(s)||!doorKnown(s.intel,doorId))return false;
 const members=team(s).filter(a=>a.health>0);
 let count=0;
 const ok=atomicTeamEdit(s,members,()=>{
  for(const a of members)if(planStack(s,a.id,doorId))count++;
  return count>0;
 });
 if(ok)notify(s,'STACK '+count+' / '+members.length);
 return ok;
}
/** Coordinated entry: reserve distinct stack positions, synchronize at
 * a shared go-code, open the door with the lead, then feed others through
 * at staggered intervals. Tactical pathfinding remains authoritative.
 */
export function planSquadEntry(s:Session,doorId:string){
 const door=s.doors.find(d=>d.id===doorId);
 if(!door||!canEdit(s)||!doorKnown(s.intel,doorId))return false;
 const alive=team(s).filter(a=>a.health>0);
 if(!alive.length)return false;
 const start=finalPoint(alive[0]);
 // Predicted entry geometry sees only discovered walls and furniture.
 // Actual doorway passage and clearance remain the live motor's authority.
 const slots=entryLanes(door,start,alive.length,p=>
   intelPassable(p,s.intel,SQUEEZE_RADIUS)&&
   !!routeWithSqueezeIntel(s.intel,start,p).length);
 if(slots.length!==alive.length){
  notify(s,'SQUAD ENTRY BLOCKED · NO DISTINCT INTERIOR LANES');
  return false;
 }
 for(let i=0;i<alive.length;i++){
  if(!routeWithSqueezeIntel(s.intel,finalPoint(alive[i]),slots[i].point).length){
   notify(s,'SQUAD ENTRY BLOCKED · CHECK ROUTE');
   return false;
  }
 }
 const committed=atomicTeamEdit(s,alive,()=>{
  for(const a of alive)
   if(!a.plan.some(n=>n.stackDoorId===doorId)&&
     !planStack(s,a.id,doorId))return false;
  if(!planSync(s,alive.map(a=>a.id)))return false;
  const lead=alive[0];
  if(!planDoor(s,lead.id,doorId,'open'))return false;
  for(let i=0;i<alive.length;i++){
   const a=alive[i],slot=slots[i];
   if(i>0){
    // A generated zero-duration gate is never an ordinary player WAIT.
    if(!planWait(s,a.id,.3))return false;
    const gate=a.plan.at(-1);
    if(gate?.kind!=='wait')return false;
    gate.doorId=doorId;gate.duration=0;
   }
   if(!planMove(s,a.id,slot.point))return false;
   const arrival=a.plan.at(-1);
   if(arrival?.kind!=='move'||
     !planAim(s,a.id,'fixed',slot.look,arrival.id,'look'))return false;
   const assigned=a.plan.find(n=>n.id===arrival.id);
   if(!assigned)return false;
   assigned.entryDoorId=doorId;
  }
  return true;
 });
 if(committed)notify(s,'SQUAD ENTRY READY · DISTINCT LANES · GO TO EXECUTE');
 return committed;
}
/** Tactical WAIT: hold for the minimum interval, and continue only after
 * any visible living contact has been absent for that entire interval.
 * Legacy holdClear nodes execute identically for old plans/replays. */
export function planWaitAt(s:Session,id:string,seconds=1,
  origin:'here'|'end'='here',afterNodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const after=afterNodeId===undefined?-1:
    a.plan.findIndex(n=>n.id===afterNodeId);
  if(afterNodeId!==undefined&&after<0)return false;
  if(afterNodeId!==undefined||origin==='here'){
    const point=afterNodeId!==undefined?a.plan[after].p:a.p;
    return edit(s,a,()=>a.plan.splice(after+1,0,{
      id:s.nextId++,kind:'wait',p:clone(point),
      duration:clamp(seconds,.3,6)}));
  }
  return planWait(s,id,seconds);
}
export function setWaitDuration(s:Session,id:string,nodeId:number,seconds:number){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||node.kind!=='wait'||!canEdit(s))return false;
  return edit(s,a,()=>{node.duration=clamp(seconds,.3,6);});
}
/** Posture and pace authored at an existing waypoint take effect on arrival
 * and remain until a later transition. An operator tap edits base/HERE state. */
/** Fire policy is persistent until changed. A waypoint can override it
 * without touching navigation or the rest of the authored plan. */
export function setFirePolicy(s:Session,id:string,policy:FirePolicy,
  nodeId?:number,point?:Pt,targetId?:string):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  if(policy==='suppress'&&(!point||
    !Number.isFinite(point.x)||!Number.isFinite(point.y)))return false;
  if(policy==='focus'){
    const target=enemies(s).find(e=>e.id===targetId&&
      e.health>0&&isSeen(s,e));
    if(!target)return false;
  }
  const change=()=>{
    if(node){
      node.firePolicyState=policy;
      node.firePoint=point?clone(point):undefined;
      node.fireTargetId=targetId;
    }else{
      a.firePolicy=policy;a.suppressPoint=point?clone(point):null;
      a.focusTargetId=targetId??null;
    }
  };
  return edit(s,a,change);
}
export function setNodeControl(s:Session,id:string,nodeId:number,
  field:'postureState'|'paceState',value:'stand'|'crouch'|'walk'|'run'){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||!canEdit(s))return false;
  return edit(s,a,()=>{Object.assign(node,{[field]:value});});
}
export function setStartPace(s:Session,id:string,pace:'walk'|'run'){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  return edit(s,a,()=>{a.pace=pace;});
}
export function plannedControl(s:Session,id:string,nodeId?:number){
  const a=party(s,id);if(!a)return {posture:'stand' as Posture,
    pace:'walk' as const};
  let posture=a.posture,pace=a.pace;
  if(nodeId===undefined)return {posture,pace};
  for(const node of a.plan){
    if(node.postureState)posture=node.postureState;
    if(node.paceState)pace=node.paceState;
    if(node.id===nodeId)break;
  }
  return {posture,pace};
}
export function setMoveSprint(s:Session,id:string,nodeId:number){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||node.kind!=='move'||!canEdit(s))return false;
  return edit(s,a,()=>{
    node.moveMode=node.moveMode==='sprint'?'advance':'sprint';
  });
}
export function planHoldClear(s:Session,id:string,origin:'here'|'end'='end',afterNodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const idx=afterNodeId===undefined?-1:a.plan.findIndex(n=>n.id===afterNodeId);
  if(afterNodeId!==undefined&&idx<0)return false;
  const p=idx>=0?a.plan[idx].p:origin==='here'?a.p:finalPoint(a);
  if(idx>=0||origin==='here')return edit(s,a,()=>{
    a.plan.splice(idx+1,0,{id:s.nextId++,kind:'holdClear',p:clone(p),duration:.5});
  });
  return addNode(s,id,'holdClear',p,{duration:.5});
}
/** A treatment order uses the same planning history and navigation authority. */
/** One authored order carries a downed teammate to a player-chosen point.
 * Existing tactical route and swept body collision remain authoritative. */
/** Retrieve one accessible item from a downed teammate into real kit capacity. */
export function planRecoverMedical(s:Session,id:string,patientId:string):boolean{
 const a=party(s,id),patient=s.operators.find(o=>o.id===patientId);
 if(!a||!patient||a===patient||a.side!==patient.side||
  patient.health>0||!canEdit(s)||medicalSupplyCount(patient.medicalSupplies)<1)return false;
 const cap=kitMedicalSupplies(a.equipment);
 if(!(['tourniquet','trauma-dressing','field-dressing'] as const)
  .some(item=>patient.medicalSupplies[item]>0&&a.medicalSupplies[item]<cap[item]))return false;
 if(!routeWithSqueezeIntel(s.intel,finalPoint(a),patient.p).length)return false;
 return addNode(s,id,'recover-medical',finalPoint(a),{patientId});
}
export function planCasualtyTransport(s:Session,id:string,patientId:string,
 to:Pt,mode:TransportMode='drag'):boolean{
 const a=party(s,id),friendly=s.operators.find(o=>o.id===patientId);
 const civil=s.civilians.find(c=>c.id===patientId),patient=friendly??civil;
 if(!a||!patient||patient===a||!canEdit(s))return false;
 if(friendly&&(friendly.side!==a.side||friendly.health>0||
    friendly.surrendered))return false;
 if(civil&&(!civilianTransportEligible(civil,a)||
    !liveVisibility(s,civil.p)))return false;
 if(!intelPassable(to,s.intel,5.4)||
  !routeWithSqueezeIntel(s.intel,finalPoint(a),patient.p).length||
  !routeWithSqueezeIntel(s.intel,patient.p,to).length)return false;
 return addNode(s,id,'evacuate',to,{patientId,transportMode:mode});
}
/** Authored emergency release supersedes only this patient's transport.
 * Other subsequent planned orders remain intact and the edit is undoable. */
export function planCivilianRelease(s:Session,id:string):boolean{
 const a=party(s,id),c=s.civilians.find(c=>c.id===a?.carryingId);
 if(!a||!c||c.carriedById!==a.id||!canEdit(s))return false;
 return edit(s,a,()=>{
   a.plan=a.plan.filter(n=>n.kind!=='evacuate'||n.patientId!==c.id);
   a.plan.unshift({id:s.nextId++,kind:'interact',p:clone(a.p),
     objectId:c.id,interaction:'release-civilian'});
 });
}
export function planMedicalTreatment(s:Session,id:string,patientId:string,
 afterNodeId?:number):boolean{
 const a=party(s,id),patient=s.operators.find(o=>o.id===patientId);
 if(!a||!patient||patient.side!==a.side||!canEdit(s))return false;
 const wound=mostUrgentWound(patient.medical);
 if(!wound||!treatmentSupplyForWound(wound,a.medicalSupplies))return false;
 const insertion=afterNodeId===undefined?-1:
   a.plan.findIndex(n=>n.id===afterNodeId);
 if(afterNodeId!==undefined&&insertion<0)return false;
 const at=insertion>=0?a.plan[insertion].p:finalPoint(a);
 const distance=d(at,patient.p);
 let goal=at;
 if(distance>26){
  const theta=angle(patient.p,at);
  goal={x:patient.p.x+Math.cos(theta)*21,
   y:patient.p.y+Math.sin(theta)*21};
  if(!intelPassable(goal,s.intel,5.4)||
     !routeWithSqueezeIntel(s.intel,at,goal).length)return false;
 }
 return edit(s,a,()=>{
  const orders:PlanNode[]=[];
  if(distance>26)orders.push({id:s.nextId++,kind:'move',p:clone(goal)});
  orders.push({id:s.nextId++,kind:'treat',p:clone(goal),
   patientId:patient.id,woundId:wound.id});
  if(insertion>=0)a.plan.splice(insertion+1,0,...orders);
  else a.plan.push(...orders);
 });
}
export function planWait(s:Session,id:string,seconds=1){
  const a=party(s,id);return a?addNode(s,id,'wait',finalPoint(a),
    {duration:clamp(seconds,.3,6)}):false;
}
export function planSync(s:Session,participantIds?:readonly string[]){
 if(!canEdit(s))return false;
 const participants=team(s).filter(a=>a.health>0&&
   (!participantIds||participantIds.includes(a.id)));
 if(!participants.length)return false;
 return atomicTeamEdit(s,participants,()=>{
  const code='B'+(++s.syncCode);
  return participants.every(a=>addNode(s,a.id,'sync',finalPoint(a),
    {syncCode:code}));
 });
}
export function clearPlan(s:Session,id:string){
 const a=party(s,id);if(!a)return false;
 const codes=new Set(a.plan.filter(n=>n.kind==='sync'&&n.syncCode)
   .map(n=>n.syncCode!));
 return editRemovingSync(s,a,codes,()=>edit(s,a,()=>{a.plan=[];}));
}
export function undoPlan(s:Session,id:string){
 return undoAuthoredPlan(s,id,party);
}
export function redoPlan(s:Session,id:string){
 return redoAuthoredPlan(s,id,party);
}
/** The weapon, hand and world share one magazine identity.
 * Ammo moves only at timed detach/insert events, never on animation startup. */
export function beginReload(s:Session,a:TeamActor):boolean{
  const w=WEAPONS[a.weapon];
  const capacity=liveMagazineCapacity(a.weapon,a.weaponConfiguration);
  if(a.health<=0||a.reload>0||a.reserve<=0||a.magazine>=capacity)return false;
  if(a.weapon!=='shotgun'&&!a.spareMagazines.length){
    const replacement=magazineKit(a.id,a.weapon,a.reserve,capacity);
    a.spareMagazines=a.equipment?stageMagazines(replacement,a.equipment):replacement;
  }
  const mode:ReloadMode=a.weapon==='shotgun'?'shells':
    a.magazine===0?'emergency':'retention';
  a.reloadMode=mode;a.reloadStartedAt=s.seconds;
  const selected=a.weapon==='shotgun'?-1:chooseReloadMagazine(a.spareMagazines);
  a.reloadSelectedMagazineId=selected>=0?a.spareMagazines[selected].id:null;
  const source=selected>=0?a.spareMagazines[selected]:undefined;
  a.reloadDuration=reloadTiming(w.reload,injuryReload(a.injuryStage),
    mode,capacity-a.magazine)+reloadMagazineDelay(source);
  a.reload=a.reloadDuration;a.reloadRemoved=false;
  a.reloadInserted=false;a.reloadFromRounds=a.magazine;
  a.reloadTargetRounds=Math.min(capacity-a.magazine,a.reserve);
  a.aim=0;
  notify(s,a.name+' '+(mode==='retention'?'RETENTION RELOAD':
    mode==='shells'?'LOADING SHELLS':'EMERGENCY RELOAD'));
  battleEvent(s,'reload',a,a.p,a.name+' RELOAD');
  return true;
}
export function advanceReload(s:Session,a:TeamActor,dt:number){
 if(a.reload<=0||!a.reloadMode)return;
 const mode=a.reloadMode,old=a.reload;
 a.reload=Math.max(0,a.reload-dt);
 const t=a.reloadDuration>0?1-a.reload/a.reloadDuration:1;
 if(mode==='shells'){
   const staged=Math.min(a.reloadTargetRounds,Math.max(0,
     Math.floor(Math.max(0,t-.20)/.68*a.reloadTargetRounds)));
   const inserted= a.magazine-a.reloadFromRounds;
   const add=Math.max(0,staged-inserted);
   if(add){
     a.magazine+=add;a.reserve-=add;
   }
 }else{
   if(!a.reloadRemoved&&t>=.29){
     a.reloadRemoved=true;
     const oldRounds=a.magazine;
     a.magazine=0;
     const oldId=a.insertedMagazineId;
     a.insertedMagazineId='';
     if(mode==='retention'&&oldRounds>0){
       a.spareMagazines.push({id:oldId,weapon:a.weapon,rounds:oldRounds});
        if(a.equipment)a.spareMagazines=stageMagazines(a.spareMagazines,a.equipment);
       a.reserve+=oldRounds;
     }else{
       s.dropped.push({id:s.nextEffectId++,p:clone(a.p),
         side:a.side,age:0,weapon:a.weapon,rounds:oldRounds,
         magazineId:oldId});
       if(s.dropped.length>48)s.dropped.shift();
     }
   }
   if(!a.reloadInserted&&t>=.82){
     const selected=a.spareMagazines.findIndex(m=>m.id===a.reloadSelectedMagazineId&&m.rounds>0);
      const index=selected>=0?selected:chooseReloadMagazine(a.spareMagazines);
     if(index>=0){
       const mag=a.spareMagazines.splice(index,1)[0];
       a.magazine=mag.rounds;a.reserve-=mag.rounds;
       a.insertedMagazineId=mag.id;
     }
     a.reloadInserted=true;
   }
 }
 if(old>0&&a.reload===0){
   if(mode==='shells'){
     const missing=Math.min(a.reloadTargetRounds,
       a.reloadFromRounds+a.reloadTargetRounds-a.magazine);
     if(missing>0){a.magazine+=missing;a.reserve-=missing;}
   }
   a.reloadMode=null;
   a.reloadSelectedMagazineId=null;
   a.reloadInserted=true;
   notify(s,a.name+' RELOADED');
 }
}
/** A tap near a jamb is aiming intent, not a demand for subpixel precision.
 * Snap only to a small, genuinely walkable/throw-reachable nearby patch. */
function snapFlashTarget(s:Session,from:Pt,target:Pt,doors:Door[],
  opened:string[]):Pt|null{
  const choices:Pt[]=[target];
  for(const r of [5,9,13,17])
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      choices.push({x:target.x+Math.cos(angle)*r,
        y:target.y+Math.sin(angle)*r});
    }
  // Editing may consider only observed structures and remembered door states.
  // True geometry is checked again by flashTrajectory during execution.
  const world=sessionWorldGeometry(s);
  const knownWalls=world.walls.filter((_,i)=>s.intel.walls.has(i));
  const knownDoors=doors.filter(d=>doorKnown(s.intel,d.id)).map(d=>{
   const remembered=s.intel.doorMemory.get(d.id)??0;
   return {...d,open:remembered>=.72,openFraction:remembered};
  });
  return choices.find(p=>intelPassable(p,s.intel,3.5)&&
    validateThrow(from,p,knownDoors,opened,{walls:knownWalls}).valid)??null;
}
/** Two team-wide flashbangs per mission. Throwing is an authored timed order. */
export function planFlash(s:Session,id:string,target:Pt):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s))return false;
  const queued=team(s).reduce((n,x)=>n+
    x.plan.filter(node=>node.kind==='flash').length,0);
  const start=finalPoint(a);
  if(queued>=s.flashRemaining||a.plan.filter(n=>n.kind==='flash').length>=a.flashCharges)return false;
  const plannedOpen=a.plan.filter(n=>n.kind==='door'&&(n.method==='open'||n.method==='kick'))
    .map(n=>n.doorId??'');
  const landing=snapFlashTarget(s,start,target,s.doors,plannedOpen);
  if(!landing)return false;
  return addNode(s,id,'flash',start,{aimPoint:clone(landing)});
}
/** Door-context FLASH: one undoable sequence. OPEN is inserted ahead of
 * the throw; never auto-enters. Target validation treats only this door
 * and previously planned opened doors as passable. */
export function planDoorFlash(s:Session,id:string,doorId:string,target:Pt,
  afterNodeId?:number):boolean{
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s)||
    !doorKnown(s.intel,doorId))return false;
  const queued=team(s).reduce((sum,x)=>sum+
    x.plan.filter(n=>n.kind==='flash').length,0);
  if(queued>=s.flashRemaining||a.plan.filter(n=>n.kind==='flash').length>=a.flashCharges)return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<0)return false;
  const start=index>0?a.plan[index-1].p:a.p;
  const approached=doorReachable(start,door)?clone(start):knownDoorApproach(s,start,door);
  if(!approached||!intelPassable(approached,s.intel,SQUEEZE_RADIUS)||
     !routeWithSqueezeIntel(s.intel,start,approached).length)return false;
  const before=a.plan.slice(0,index);
  const opened=before.filter(n=>n.kind==='door'&&(n.method==='open'||n.method==='kick'))
    .map(n=>n.doorId??'');
  const needsOpen=!opened.includes(doorId)&&
    (s.intel.doorMemory.get(doorId)??0)<.72;
  const landing=snapFlashTarget(s,approached,target,s.doors,
    needsOpen?[...opened,doorId]:opened);
  if(!landing)return false;
  return edit(s,a,()=>{
    const added:PlanNode[]=[];
    if(needsOpen)added.push({id:s.nextId++,kind:'door',
      p:clone(approached),doorId,method:'open'});
    added.push({id:s.nextId++,kind:'flash',p:clone(approached),
      aimPoint:clone(landing)});
    a.plan.splice(index,0,...added);
  });
}
/** Dragging a flash marker changes its landing point, not the thrower's position. */
export function moveFlashTarget(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const candidate=a.plan.find(n=>n.id===nodeId&&n.kind==='flash');
  if(!candidate)return false;
  const index=a.plan.indexOf(candidate);
  const opened=a.plan.slice(0,index).filter(n=>n.kind==='door'&&
    (n.method==='open'||n.method==='kick')).map(n=>n.doorId??'');
  const landing=snapFlashTarget(s,candidate.p,p,s.doors,opened);
  if(!landing)return false;
  return edit(s,a,()=>{candidate.aimPoint=clone(landing);});
}
export function flashTrajectory(s:Session,a:TeamActor,node:PlanNode):ThrowPath|null{
  if(node.kind!=='flash'||!node.aimPoint)return null;
  const index=a.plan.findIndex(n=>n.id===node.id);
  const open=a.plan.slice(0,index).filter(n=>n.kind==='door'&&
    (n.method==='open'||n.method==='kick')).map(n=>n.doorId??'');
  return validateThrow(node.p,node.aimPoint,s.doors,open,sessionWorldGeometry(s));
}
function battleEvent(s:Session,kind:BattleEvent['kind'],a:TeamActor|null,p:Pt,text:string,
  meta?:BattleEvent['meta']){
  s.battleEvents.push({id:s.nextBattleId++,kind,t:s.seconds,
    actor:a?.id,p:clone(p),text,...(meta?{meta}:{})});
  if(s.battleEvents.length>500)s.battleEvents.shift();
}
export function equipWeaponChoice(s:Session,id:string,next:WeaponId):boolean{
  const a=party(s,id);if(!a||!canEdit(s)||
    !(['carbine','smg','rifle','shotgun'] as WeaponId[]).includes(next))return false;
  if(a.weapon===next)return true;
  a.weapon=next;
  if(a.weaponConfiguration)a.weaponConfiguration=changeWeaponPlatform(a.weaponConfiguration,next);
  const issue=freshMagazineIssue(a.id,next,a.weaponConfiguration);
   a.magazine=issue.magazine;a.reserve=issue.reserve;a.reload=0;a.aim=0;
   a.insertedMagazineId=issue.loadedMagazineId;
   a.spareMagazines=issue.magazines;
  a.reloadMode=null;a.reloadRemoved=false;a.reloadInserted=false;
  notify(s,a.name+' EQUIPPED '+WEAPONS[next].label);
  return true;
}
/** Historical cycling API retained for callers that still use it. */
export function cycleWeapon(s:Session,id:string):boolean{
  const a=party(s,id);if(!a)return false;
  const ids:WeaponId[]=['carbine','smg','rifle','shotgun'];
  return equipWeaponChoice(s,id,ids[(ids.indexOf(a.weapon)+1)%ids.length]);
}
export function planReload(s:Session,id:string):boolean{
  const a=party(s,id);
  return !!a&&canEdit(s)&&addNode(s,id,'reload',finalPoint(a));
}
/** Insert reload at the selected HERE/waypoint, without moving the route. */
export function planReloadAt(s:Session,id:string,afterNodeId?:number){
 const a=party(s,id);if(!a||!canEdit(s))return false;
 const index=afterNodeId===undefined?0:a.plan.findIndex(n=>n.id===afterNodeId)+1;
 if(index<0)return false;
 const p=index===0?a.p:a.plan[index-1].p;
 return edit(s,a,()=>a.plan.splice(index,0,{id:s.nextId++,
   kind:'reload',p:clone(p)}));
}
export function reloadNow(s:Session,id:string):boolean{
  const a=party(s,id);
  return !!a&&s.phase==='running'&&beginReload(s,a);
}
/** Lights are manually operated in the field and are only usable when mounted.
 * The toggle never simulates unauthoritative fog-of-war or changes a shot. */
export function toggleWeaponLight(s:Session,id:string):boolean{
 const a=party(s,id);
 if(!a||s.phase!=='planning'&&s.phase!=='running'||
  a.weaponConfiguration?.slots.light!=='light-compact')return false;
 a.weaponLightOn=!a.weaponLightOn;
 return true;
}
export function toggleContactRule(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  return edit(s,a,()=>{a.haltOnContact=!a.haltOnContact;});
}
export function posture(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  return edit(s,a,()=>{a.posture=a.posture==='stand'?'crouch':'stand';});
}
export function toggling(s:Session){
  if(s.phase==='planning'){
    // Calculate ALL participants and their earliest doorway arrivals
    // before the first motor tick, not when they crowd the doorway.
    passageSchedules.delete(s);
    ensurePassageSchedule(s);
    s.passageLeases={};
    sealPlanHistoryForExecution(s);
    s.phase='running';s.started=true;
  }else if(s.phase==='running'){s.phase='planning';s.timesPaused++;}
}
export function notify(s:Session,event:string){
  if(s.events.at(-1)===event)return;
  s.events.push(event);if(s.events.length>12)s.events.shift();
}
function hear(s:Session,p:Pt,radius:number,kind:string){
  s.noise.push({id:s.nextNoiseId++,p:clone(p),radius,time:s.seconds,kind});
  if(s.noise.length>22)s.noise.shift();
}
function unobstructed(a:Pt,b:Pt,s:Session,lowBlocks:boolean){
  const ray={a,b};
  if(sessionWorldGeometry(s).staticWallBlocksRay(ray))return false;
  if(doorBlocksSightRay(s.doors,ray))return false;
  // The broadphase only excludes distant static obstacles; the final
  // slab and optical tests remain authoritative at any framerate.
  return !sessionWorldGeometry(s).someCoverAlongRay(a,b,o=>coverBlocksOpticalSight(o,lowBlocks)&&
    segmentHitsBox(a,b,o));
}
/** Physical geometry visibility, independently of acquisition time. */
export function geometricallyVisible(a:TeamActor,b:TeamActor,s:Session){
  // Most pairs are outside acquisition distance or facing. Reject them
  // BEFORE touching the cache or checking any doors. Only genuinely
  // possible LOS rays are expensive enough to merit memoization.
  if(a.health<=0||b.health<=0||d(a.p,b.p)>240)return false;
  const delta=angleDifference(a.heading,angle(a.p,b.p));
  if(Math.abs(delta)>.94)return false;
  let cache=perceptionBySession.get(s);
  if(!cache){cache=new PerceptionPairCache();perceptionBySession.set(s,cache);}
  // This remains exact through mid-tick door interactions, actor movement,
  // crouching and cover damage. Neither fog nor awareness is cached.
  return cache.get(a,b,s.seconds,
    s.objectRevision+'/'+sessionWorldGeometry(s).revision,s.doors,()=>
      !exposure(a.p,b.p,s.doors,
        b.posture==='crouch',a.posture==='crouch',true,
        sessionWorldGeometry(s).walls,sessionWorldGeometry(s).cover).blocked);
}
/** Confirmed vision is acquired over simulated time; rendering never grants sight. */
export function inSight(a:TeamActor,b:TeamActor,s:Session){
 return geometricallyVisible(a,b,s)&&confirmedSight(a.awareness.visualProgress[b.id]??0);
}
export const isSeen=(s:Session,target:TeamActor)=>
  s.intel.mode==='full-view'||team(s).some(a=>inSight(a,target,s));
export function lastKnown(s:Session,id:string){
  return s.known.get(id)??null;
}
function observe(s:Session){
  observeActorContactEvidence(s,inSight);
  const updateGround=s.intelObservedAt<0||
    s.seconds-s.intelObservedAt>=.14;
  if(updateGround){
    observeIntel(s.intel,s.site,s.doors,p=>liveVisibility(s,p));
    s.intelObservedAt=s.seconds;
  }
  // Site knowledge persists, current knowledge does not. Sight has geometry,
  // distance and facing: invisible opponents never leak through the UI.
  for(const blue of team(s)){
    if(blue.health<=0)continue;
    // Remember every small patch actually seen, including areas that
    // fall between the old 40-unit sample points when pieing a room.
    // Do this at an intel cadence, not on every 60 Hz sim tick.
    if(updateGround){
      const beforeGroundSize=s.seenGround.size;
      const sight=groundView(blue.p.x,blue.p.y,blue.heading);
      const bounds=s.site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
      // Preserve the exact historical ordering of fine and micro samples,
      // and keep occlusion / memory mutation in authoritative simulation.
      forEachGroundSightCandidate(sight,bounds,20,(col,row,p)=>{
        if(!unobstructed(blue.p,p,s,blue.posture==='crouch'))return;
        const fine='fine:'+col+','+row;
        s.seenGround.add(fine);
        notePersonalGround(s,blue.id,s.seconds,fine);
        const coarse=Math.floor(p.x/40)+','+Math.floor(p.y/40);
        s.seenGround.add(coarse);
        notePersonalGround(s,blue.id,s.seconds,coarse);
      });
      forEachGroundSightCandidate(sight,bounds,10,(col,row,p)=>{
        if(!unobstructed(blue.p,p,s,blue.posture==='crouch'))return;
        const micro=microKeyAt(col,row);
        s.seenGround.add(micro);
        notePersonalGround(s,blue.id,s.seconds,micro);
      });
      if(s.seenGround.size!==beforeGroundSize)s.seenGroundRevision++;
    }
    for(const e of enemies(s)){
      if(inSight(blue,e,s)){
        const old=s.known.get(e.id);
        if(!old||s.seconds-old.at>.20){
          notify(s,'CONTACT '+e.name);
          battleEvent(s,'intel',blue,blue.p,blue.name+' SPOTTED '+e.name,
            {action:'spot',targetId:e.id});
        }
        s.known.set(e.id,{p:clone(e.p),at:s.seconds,status:'seen'});
        s.spotted.add(e.id);e.lastSpotted=clone(e.p);
      }
    }
  }
}
/** All physical locomotion now shares one fixed-tick motor coordinator.
 * This is deliberately the sole simulation-side port for noises, events,
 * route cache and passage schedule. No rendered frame owns movement. */
const motorHooks:ActorMotorHooks={
 notify,hear,battleEvent,cachedEnemyRoute,knownShoveCrossing,ensurePassageSchedule
};
function approach(a:TeamActor,p:Pt,dt:number,s:Session,speedScale=1){
 return advanceActorMotor(a,p,dt,s,motorHooks,speedScale);
}
/** Authoritative 60 Hz session keeps the clock, gameplay side effects and
 * stable navigation/visibility services; order handlers own execution.
 * Create once: no per-frame callback allocations or second state machine. */
const runOrders=createOrderExecutor({
 approach,
 advanceTraversal:(a,s,dt)=>advanceMotorTraversal(a,s,dt,motorHooks),
 notify,hear,battleEvent,inSight,liveVisibility,pairedLeaves,
 movePhysicalProp,beginReload
});
/** Single enemy decision port; execution continues on the existing 60 Hz clock. */
/** Shared physical combat authority for both players and enemy AI. */
const runCombat=createCombatFiringPipeline({
 team,enemies,inSight,isSeen,liveVisibility,unobstructed,
 beginReload,advanceReload,notify,hear,battleEvent
});
const runEnemyAi=createEnemyDecisionController({
 approach,cachedEnemyRoute,
 requestClearFireStep:runCombat.requestClearFireStep,inSight,
 enemies,hear,notify,battleEvent
});
function mission(s:Session,dt:number){
  // The equipment range is an intentionally open-ended live simulation.
  // It cannot accidentally complete a Campaign mission or generate a debrief.
  if(s.site?.training)return;
  // Intel is an actual carried mission item. An incapacitated courier
  // drops it at their final observed location for another operator to
  // recover; a different teammate cannot magically extract it.
  if(s.missionType==='intel'&&s.mission==='extract'&&s.intelCarrierId){
    const courier=team(s).find(a=>a.id===s.intelCarrierId);
    if(!courier||courier.health<=0){
      if(courier)s.scenario.objective=clone(courier.p);
      s.intelCarrierId=null;s.mission='secure';s.holdTime=0;
      notify(s,'INTEL DROPPED — RECOVER AT CASUALTY');
      battleEvent(s,'objective',courier??null,s.scenario.objective,
        'INTEL DROPPED');
    }
  }
  const rescuePerson=s.civilians.find(c=>c.rescueTarget);
  if(s.rescue&&rescuePerson){
    s.rescue.p=clone(rescuePerson.p);
  }
  if(s.rescue&&s.mission==='extract'&&rescuePerson){
    const prior=s.rescue.following;
    let escort=team(s).find(a=>a.id===prior&&a.health>0)??null;
    if(prior&&rescueEscortSeparated(rescuePerson,escort)){
      s.rescue.following=null;rescuePerson.following=null;
      rescuePerson.goal=null;rescuePerson.nav=[];
      setCivilianState(rescuePerson,'frozen',s.seconds);
      escort=null;notify(s,'ESCORT SEPARATED — RETURN TO PERSON');
    }
    // A real neutral requires an authored FOLLOW order. Nearness alone
    // never re-attaches a separated escort. The legacy marker path
    // below keeps its original auto-join for older missions.
    if(escort&&s.rescue.following===escort.id&&
       s.seconds-rescuePerson.lastEscortRouteAt>=.55){
      // Plan from actual civilian location to just behind the real escort.
      // The existing geometry-aware route is bounded and never teleports.
      const desired=rescueFollowGoal(escort);
      const path=cachedEnemyRoute(s,rescuePerson.p,desired,true);
      const next=path.find(p=>d(p,rescuePerson.p)>10);
      if(next&&sweptBodyClear(rescuePerson.p,next,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))){
        rescuePerson.goal=clone(next);
        rescuePerson.state='escorted';
      }else rescuePerson.goal=null;
      rescuePerson.lastEscortRouteAt=s.seconds;
    }
    s.rescue.p=clone(rescuePerson.p);
  }else if(s.rescue&&s.mission==='extract'){
    // Legacy rescue compatibility: no duplicate real civilian exists.
    const prior=s.rescue.following;
    const escort=team(s).find(a=>a.id===prior&&a.health>0);
    if(prior&&escort){
      s.rescue=advanceRescueEscort(s.rescue,escort.p,dt,
        (from,to)=>sweptBodyClear(from,to,s.doors,5.5,sessionWorldGeometry(s)));
      if(!s.rescue.following)notify(s,'ESCORT SEPARATED — RETURN TO PERSON');
    }else if(prior){
      s.rescue={...s.rescue,following:null,trail:[]};
      notify(s,'ESCORT DOWN — PERSON WAITING');
    }
    if(!s.rescue.following){
      const rescuer=team(s).find(a=>a.health>0&&
        near(a.p,s.rescue!.p,26)&&
        sweptBodyClear(a.p,s.rescue!.p,s.doors,5.5,sessionWorldGeometry(s)));
      if(rescuer){
        s.rescue={...s.rescue,following:rescuer.id,
          trail:[clone(s.rescue.p),clone(rescuer.p)]};
        notify(s,'PERSON JOINED '+rescuer.name);
      }
    }
  }
  if(team(s).every(a=>a.health<=0)){
    s.phase='lost';s.report=['OPERATION FAILED','ALL OPERATORS LOST'];return;
  }
  const captured=s.missionType==='capture'&&s.captureTarget?
    enemies(s).some(a=>a.id===s.captureTarget&&a.health<=0):false;
  if(s.mission==='clear'&&
    (captured||(s.missionType!=='capture'&&enemies(s).every(a=>a.health<=0)))){
    s.mission='secure';
    if(captured){
      const target=enemies(s).find(a=>a.id===s.captureTarget);
      if(target)s.scenario.objective=clone(target.p);
    }
    notify(s,s.missionType==='capture'?'TARGET NEUTRALIZED — SECURE':
      'CLEAR — SECURE OBJECTIVE');
    battleEvent(s,'objective',null,s.scenario.objective,'HOSTILES SECURED');
  }
  // Wall-adjacent proximity alone does not permit a remote interaction.
  const objectivePoint=rescuePerson?rescuePerson.p:s.scenario.objective;
  const atObjective=team(s).filter(a=>a.health>0&&
    near(a.p,objectivePoint,36)&&
    sweptBodyClear(a.p,objectivePoint,s.doors,4,sessionWorldGeometry(s)));
  const objectiveReached=atObjective.length>0;
  if(s.mission==='secure'&&objectiveReached&&
     (s.missionType!=='rescue'||!rescuePerson||
      (rescuePerson.state==='compliant'||!!rescuePerson.carriedById))){
    if(s.missionType==='hold'){
      // A contested position is not secured merely by standing on its
      // marker. Nearby active defenders arrest the actual hold clock.
      const contested=enemies(s).some(e=>e.health>0&&
        near(e.p,s.scenario.objective,74));
      if(contested){
        s.holdTime=Math.max(0,s.holdTime-dt*.6);
        return;
      }
      s.holdTime+=dt;
      if(s.holdTime<7)return;
    }
    if(s.missionType==='intel'){
      // Deliberate timed pickup. The operator who physically did the
      // collection becomes the item carrier, not the whole squad.
      s.holdTime+=dt;
      if(s.holdTime<1.2)return;
      const collector=atObjective[0];
      if(!collector)return;
      s.intelCarrierId=collector.id;
    }
    if(s.missionType==='capture'){
      const target=enemies(s).find(e=>e.id===s.captureTarget);
      if(!target||target.health>0)return;
      s.captureSecured=true;
    }
    s.mission='extract';
    if(s.rescue){
      if(rescuePerson){
        // SECURE reveals a real person; only a queued FOLLOW command
        // grants their cooperation for the extraction.
        s.rescue={...s.rescue,p:clone(rescuePerson.p),
          following:null,trail:[]};
        rescuePerson.following=null;
      }else{
        const escort=atObjective.sort((a,b)=>
          d(a.p,s.rescue!.p)-d(b.p,s.rescue!.p))[0];
        s.rescue={...s.rescue,following:escort?.id??null,
          trail:escort?[clone(s.rescue.p),clone(escort.p)]:[]};
      }
    }
    const verb=s.missionType==='rescue'?'PERSON FOUND':
      s.missionType==='hold'?'POSITION HELD':
      s.missionType==='intel'?'DOCUMENTS RECOVERED':
      s.missionType==='capture'?'TARGET SECURED':'OBJECTIVE SECURED';
    notify(s,verb+' — EXTRACT');
    battleEvent(s,'objective',null,s.scenario.objective,verb,
      {action:'objective-secure',objectId:s.missionType,
       contributorId:atObjective[0]?.id});
  }else if((s.missionType==='hold'||s.missionType==='intel')&&
    s.mission==='secure'){
    s.holdTime=Math.max(0,s.holdTime-dt*.6);
  }
  // Match each rescue person with the real owner of their current custody.
  const validRescueCustody=(a:TeamActor)=>!s.rescue||
    (rescuePerson?
      (((rescuePerson.following===a.id&&s.rescue.following===a.id)||
        (rescuePerson.carriedById===a.id&&a.carryingId===rescuePerson.id))&&
        near(rescuePerson.p,s.scenario.extract,37)):
      s.rescue.following===a.id&&near(s.rescue.p,s.scenario.extract,37));
  if(s.mission==='extract'&&team(s).some(a=>a.health>0&&
    near(a.p,s.scenario.extract,37)&&
    (s.missionType!=='intel'||s.intelCarrierId===a.id)&&
    validRescueCustody(a))){
    s.mission='done';s.phase='won';
    s.report=['OPERATION COMPLETE',s.missionType.toUpperCase(),
      'EXTRACTION COMPLETE'];
    notify(s,'MISSION COMPLETE');
    battleEvent(s,'objective',null,s.scenario.extract,'MISSION COMPLETE');
  }
}
function stepFlashbangs(s:Session,h:number){
  const active:FlashGrenade[]=[];
  for(const g of s.grenades){
    g.age+=h;
    const t=Math.min(1,g.age/.55);
    const arc=4*t*(1-t);
    g.p=g.path?sampleThrow(g.path,t).p:{
      x:g.from.x+(g.to.x-g.from.x)*t,
      y:g.from.y+(g.to.y-g.from.y)*t};
    void arc; // The renderer supplies the vertical ballistic arc.
    if(g.age<g.fuse){active.push(g);continue;}
    s.flashBursts.push({id:g.id,p:clone(g.to),age:0});
    battleEvent(s,'flash',null,g.to,'FLASH DETONATED');
    hear(s,g.to,420,'flashbang');
    for(const a of s.operators){
      if(a.health<=0)continue;
      const dist=d(a.p,g.to);
      if(dist>105)continue;
      const ray={a:g.to,b:a.p};
      const blocked=sessionWorldGeometry(s).walls.some(w=>segmentsCross(ray,w))||
        doorBlocksRay(s.doors,ray);
      if(blocked)continue;
      const duration=2.8*(1-dist/140);
      a.flashUntil=Math.max(a.flashUntil,s.seconds+duration);
      a.aim=0;a.suppression=Math.max(a.suppression,.68);
      if(a.side==='red'){a.alert='cover';a.nav=[];}
    }
    notify(s,'FLASH DETONATED');
  }
  s.grenades=active;
}
/** Automatic close-contact separation when two opposing actors reach
 * point-blank range. This does not author a new order or grant a free kill.
 * A short bash interrupts the opponent's firearm and tries legal knockback. */
function resolveCloseContact(s:Session){
  for(let i=0;i<s.operators.length;i++){
    const a=s.operators[i];
    if(a.health<=0||a.surrendered||s.seconds-a.lastBashAt<2.2)continue;
    for(let j=0;j<s.operators.length;j++){
      const b=s.operators[j];
      if(b===a||b.side===a.side||b.health<=0||b.surrendered||
        s.seconds-b.lastBashAt<.9)continue;
      const gap=d(a.p,b.p);
      if(gap>=17||gap<.01)continue;
      const toward=angle(a.p,b.p);
      if(gap>10&&Math.abs(angleDifference(a.heading,toward))>1.45)
        continue;
      const ux=(b.p.x-a.p.x)/gap,uy=(b.p.y-a.p.y)/gap;
      for(const shift of [16,10,5]){
        const pushed={x:b.p.x+ux*shift,y:b.p.y+uy*shift};
        if(!sweptBodyClear(b.p,pushed,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s)))continue;
        if(s.operators.some(o=>o!==a&&o!==b&&o.health>0&&
          d(o.p,pushed)<11))continue;
        b.priorP=clone(b.p);b.p=pushed;break;
      }
      a.lastBashAt=s.seconds;a.lastBashRole='push';
      b.lastBashAt=s.seconds;b.lastBashRole='receive';
      b.fireCd=Math.max(b.fireCd,.62);b.aim=Math.max(0,b.aim-.65);
      b.stability=Math.max(0,b.stability-.3);
      b.suppression=Math.min(1,b.suppression+.6);
      b.velocity=0;b.nav=[];
      a.velocity=0;a.recoil=Math.min(.9,a.recoil+.12);
      notify(s,a.name+' PUSHED '+b.name);
      break;
    }
  }
}
/** Shared gameplay action; physical object selection is based on its ID. */
export function movePhysicalProp(s:Session,index:number,to:Pt):boolean{
 if(s.phase==='won'||s.phase==='lost')return false;
 const moved=relocateCover(s.coverState,index,to,sessionWorldGeometry(s).walls,s.doors,
   [...s.operators.filter(a=>a.health>0).map(a=>a.p),
    ...s.civilians.filter(c=>c.health>0).map(c=>c.p)]);
 if(!moved)return false;
 s.objectRevision++;
 publishSessionCoverToActiveSite(s);
 hear(s,to,65,'furniture');
 battleEvent(s,'interaction',null,to,'FURNITURE MOVED');
 return true;
}
/** Game-specific executor ports. Mechanics have dedicated phase owners;
 * this facade only provides session-specific AI and order services. */
const actorSimulationPhasePort:ActorSimulationPhasePort={
 notify,battleEvent,unobstructed,
 defensivePosition:(a,threat,s)=>runEnemyAi.defensivePosition(a,threat,s),
 decideEnemy:(s,a,h)=>runEnemyAi.decide(s,a,h),
 runFriendly:runOrders
};
const motionSimulationPhasePort:MotionSimulationPhasePort={
 canSee:unobstructed,
 routeTo:(s,from,to)=>cachedEnemyRoute(s,from,to,true)
};
const medicalDoorPhasePort={notify,battleEvent};
const simulationPhasePort:SimulationPhasePort={
 medicalDoors:(s,h)=>advanceMedicalDoorPhase(s,h,medicalDoorPhasePort),
 flashbangs:stepFlashbangs,
 visualAwareness:(s,h)=>advanceActorSightProgress(s,h,geometricallyVisible),
 beliefAging:(s,h)=>advanceBeliefAgingPhase(s,h,unobstructed),
 actorActions:(s,h,markActor)=>advanceSimulationActors(s,h,actorSimulationPhasePort,markActor),
 motion:(s,h,origins)=>advanceSimulationMotion(s,h,origins,motionSimulationPhasePort),
 contacts:resolveCloseContact,
 reports:s=>runEnemyAi.distributeReports(s),
 observe,
 fire:(s,h)=>{for(const a of s.operators)runCombat.fire(s,a,h);},
 mission
};
/** The only public entry into authoritative session evolution. UI and replay
 * never call the phase director; clock clamp is unchanged from the baseline. */
export type StepPhaseProbe=(phase:string,elapsedMs:number)=>void;
export function stepSession(s:Session,dt:number,probe?:StepPhaseProbe):void{
 if(s.phase!=='running')return;
 advanceSimulationTick(s,clamp(dt,0,1/30),simulationPhasePort,probe);
}
export function operationBriefing(s:Session){
  const brief=operationBrief(s.missionType);
  return { ...brief,
    building:s.site?.archetype?.toUpperCase()??'UNSPECIFIED SITE',
    layout:s.intel.mode==='floor-plan'&&s.site?
      s.site.roomCount+' DOCUMENTED ROOMS':'INTERIOR NOT FULLY CHARTED',
    squad:team(s).length,
  };
}
export function missionText(s:Session){
  if(s.phase==='won')return 'COMPLETE — OPERATION SUCCESS';
  if(s.phase==='lost')return 'MISSION FAILED';
  if(s.mission==='clear')return s.missionType==='capture'?
    'INCAPACITATE OR FORCE SURRENDER OF TARGET':
    'CLEAR HOSTILES • SECURE OBJECTIVE';
  if(s.mission==='secure')return s.missionType==='hold'?
    'HOLD OBJECTIVE • '+Math.floor(s.holdTime)+'/7 SECONDS':
    s.missionType==='rescue'?'REACH PERSON IN TARGET ROOM':
    s.missionType==='intel'?'RECOVER INTELLIGENCE • '+
      s.holdTime.toFixed(1)+'/1.2s':
    s.missionType==='capture'?'SECURE NEUTRALIZED TARGET':
    'SECURE OBJECTIVE';
  return s.missionType==='intel'?
    'RETURN TO EXTRACTION · INTEL CARRIER MUST EXIT':
    s.missionType==='rescue'?
    'ESCORT OR TRANSPORT PERSON TO EXTRACTION':
    'RETURN TO EXTRACTION OUTSIDE';
}
export function debrief(s:Session){
  const own=team(s);
  const casualties=own.filter(a=>a.health<=0).length;
  const casualtyCare=stabilizationSummary(own);
  const evacuated=own.filter(a=>a.health<=0&&
   near(a.p,s.scenario.extract,47)).map(a=>a.id);
  const shots=own.reduce((t,a)=>t+a.shots,0);
  const hits=own.reduce((t,a)=>t+a.hits,0);
  const target=enemies(s).find(e=>e.id===s.captureTarget);
  const rescuePerson=s.civilians.find(c=>c.rescueTarget);
  const rescueStatus=!rescuePerson?'none':
    s.mission!=='done'?'not-extracted':
    rescuePerson.health<=0?'incapacitated':
    rescuePerson.injuryStage>0?'injured':'healthy';
  const civilianInjured=s.civilians.filter(c=>c.health>0&&
    c.injuryStage>0).length;
  const civilianDown=s.civilians.filter(c=>c.health<=0).length;
  const attributable=attributableCivilianHarm(s.civilianHarmEvents);
  const assessment=assessOperation({
    outcome:s.phase==='won'?'success':'failure',
    kind:s.missionType as OperationKind,
    elapsed:Math.floor(s.seconds),casualties,teamSize:own.length,
    shots,hits,objective:s.mission==='done',
    targetSurrendered:target?.surrendered??false,
    civilianInjured,civilianDown,
    civilianPlayerInjured:attributable.injured,
    civilianPlayerDown:attributable.down,
    extracted:own.filter(a=>a.health>0&&
      near(a.p,s.scenario.extract,47)).length,
  });
  return {result:s.phase,time:Math.floor(s.seconds),casualties,
    stabilizedCasualties:casualtyCare.stabilized,
    criticalCasualties:casualtyCare.critical,
    evacuatedCasualties:evacuated,
    shots,hits,civilianInjured,civilianDown,rescueStatus,
    civilianPlayerInjured:attributable.injured,
    civilianPlayerDown:attributable.down,
    kills:own.reduce((t,a)=>t+a.kills,0),
    pauses:s.timesPaused,variant:s.scenario.name,
    objective:s.mission==='done',
    type:s.missionType,
    grade:assessment.grade,score:assessment.score,
    accuracy:assessment.accuracy,survived:assessment.survived,
    squad:own.map(a=>({id:a.id,name:a.name,
      survived:a.health>0,injury:a.injuryStage,
      fired:a.shots,hits:a.hits})),
    captureSecured:s.captureSecured,
    rescueExtracted:!!s.rescue&&s.phase==='won',
    intelCarrier:s.intelCarrierId};
}
export function knownAt(s:Session,x:number,y:number){
  if(s.intel.mode==='full-view')return true;
  return coarseGroundEvidenceAt(s.seenGround,{x,y});
}
/** Confirmed geometric *point* sight for individual friendly observers.
 * This matches liveVisibility's distance, facing and occlusion contract,
 * but deliberately does NOT grant full-view or shared-team knowledge.
 * Used only at authoritative recording time for personal civilian evidence.
 */
/** Shared friendly ground-FOV precheck. Geometry/LOS and acquired actor
 * awareness remain separate authoritative decisions, not renderer hints. */
function friendlyGroundSightCandidate(observer:TeamActor,p:Pt):boolean{
  return observer.side==='blue'&&observer.health>0&&
    groundViewCandidate(cachedActorGroundView(observer),p.x,p.y);
}
export function observerPointVisible(
  s:Session,observer:TeamActor,p:Pt
):boolean{
  if(sightDiagnosticsEnabled)sightDiagnosticCounts.personalQueries++;
  if(!friendlyGroundSightCandidate(observer,p))return false;
  if(sightDiagnosticsEnabled)sightDiagnosticCounts.personalOcclusionProbes++;
  return unobstructed(observer.p,p,s,observer.posture==='crouch');
}
export function liveVisibility(s:Session,p:Pt){
  if(sightDiagnosticsEnabled)sightDiagnosticCounts.liveQueries++;
  if(s.intel.mode==='full-view'){
    if(sightDiagnosticsEnabled)sightDiagnosticCounts.fullViewQueries++;
    return true;
  }
  // Count potential LOS work only for opt-in diagnostics. Every real
  // occlusion query remains authoritative; these are not sight caches.
  // The normal path pays only the disabled Boolean checks.
  for(const a of s.operators){
    if(!friendlyGroundSightCandidate(a,p))continue;
    if(sightDiagnosticsEnabled)sightDiagnosticCounts.liveOcclusionProbes++;
    if(unobstructed(a.p,p,s,a.posture==='crouch')){
      if(sightDiagnosticsEnabled)sightDiagnosticCounts.liveHits++;
      return true;
    }
  }
  return false;
}
export function nearestDoor(s:Session,p:Pt):Door|null{
  // Preserve the existing stable first-door tie break without sorting
  // and allocating a candidate list on each contextual door query.
  let nearest:Door|null=null;
  let best=35;
  for(const door of s.doors){
    if(door.open)continue;
    const distance=d(p,doorCenter(door));
    if(distance<best){best=distance;nearest=door;}
  }
  return nearest;
}
