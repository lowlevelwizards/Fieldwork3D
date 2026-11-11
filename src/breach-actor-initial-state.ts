/** Fresh per-actor tactical defaults. No global state or random draws.
 * Session construction, training and generated encounters must share this
 * single initialization contract so replay and actor state remain in parity.
 */
import type {Operator} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {makeHistory} from './breach-plan.ts';
import {newMedicalCondition} from './breach-medical-wounds.ts';
import {kitMedicalSupplies} from './equipment-medical-supplies.ts';
import {newAwareness} from './breach-awareness.ts';
import {newSuspicion} from './breach-ai-suspicion.ts';
import {magazineKit} from './breach-magazines.ts';
import {DEFAULT_SKILLS} from './breach-skills.ts';

export const withActions=(a:Operator):TeamActor=>({
  ...a,medical:newMedicalCondition(),medicalSupplies:kitMedicalSupplies(),
  lastTreatmentAt:-100,lastTreatmentTargetId:null,
  treatmentActive:false,treatmentProgress:0,
  carryingId:null,carriedById:null,wedgeRemaining:0,
  awareness:newAwareness(),suspicion:newSuspicion(),lastVisualSuspicionId:null,
  intent:null,combatChoice:null,lastReportAt:-100,
  coordinationRole:null,coordinationUntil:0,lastMoraleEventAt:-100,searchOrigin:null,searchQueue:[],searchPauseUntil:0,plan:[],history:makeHistory(),nav:[],activeNode:-1,
  posture:'stand',pace:'walk',alert:'idle',velocity:0,turning:0,aim:0,
  targetId:null,suppression:0,stamina:1,magazine:12,reserve:36,
  reload:0,hits:0,kills:0,pointShots:0,aimedShots:0,longHits:0,
  stopped:false,contact:null,heard:null,
  insertedMagazineId:a.id+'/carbine/loaded',
  spareMagazines:magazineKit(a.id,'carbine',36,12),
  reloadMode:null,reloadStartedAt:-100,reloadDuration:0,
  reloadRemoved:false,reloadInserted:false,reloadFromRounds:0,
  reloadTargetRounds:0,reloadSelectedMagazineId:null,
  alertUntil:0,waitRemaining:0,syncReady:null,actionTimer:0,
  blockedTime:0,lastNavRepairAt:-10,lastNormalLaneProbeAt:-10,
  priorP:{...a.p},haltOnContact:false,retreatPoint:null,
  recoveryAttempts:0,retryRouteAt:0,routeGoalKey:'',
  lastAutoShoveAt:-100,
  squeeze:false,squeezeYaw:a.heading,squeezeTime:0,
   autoSidestep:null,
  traversalPending:null,traversal:null,traversalElapsed:0,
  traversalElevation:0,lastTraversalAt:-100,
  traversalRetreating:false,
  lastBlocker:'clear',motorPause:null,orderIssue:null,completedOrders:0,
  passageWaitSeconds:0,passageStallReported:false,
  executionLastStatus:null,
  pieIndex:0,aimInstruction:null,lastHitAt:-100,lastDownAt:-100,
  lastHitRegion:'torso',lastHitYaw:0,lastHitSeverity:0,
  downPose:'forward',downClearance:1,
  yieldTarget:null,yieldFor:null,yieldUntil:0,
  personality:'guard',morale:1,lastNoiseAt:-1,
  lastNoiseExaminedAt:-1,lastNoiseExaminedId:0,flashUntil:-1,
  lastThrowAt:-100,lastDoorAt:-100,lastDoorId:null,
  lastDoorMethod:'open',stride:0,
  weaponYaw:a.heading,stability:.55,recoil:0,lastShotAt:-100,
  lastBashAt:-100,lastBashRole:null,
  lastLaneWarnAt:-100,lastFireBlock:'clear',
  fireRetreatTarget:null,fireRetreatUntil:0,lastFireRetreatAt:-100,
  fireMode:'point',burstCount:0,skills:{...DEFAULT_SKILLS},appearanceSeed:0,
  weaponLightOn:false,
  armorIntegrity:0,helmetIntegrity:0,flashCharges:2,
  firePolicy:'engage',suppressPoint:null,focusTargetId:null,
  weapon:'carbine',injuryStage:0,defense:null,watch:null,
  defenseUntil:0,surrendered:false,lastFireRepositionAt:-100,
  lastMissionEvadeAt:-100,lastEnemyDoorCloseAt:-100,
});
