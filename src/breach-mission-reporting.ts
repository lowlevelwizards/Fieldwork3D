/** Pure mission briefing, status copy and After Action assessment.
 * Reads authoritative Session evidence; does not mutate the simulation or
 * replay. Isolated from frame/render state to keep reporting truthful.
 */
import type {Session} from './breach-game.ts';
import {team,enemies} from './breach-session-selectors.ts';
import {operationBrief,assessOperation,type OperationKind} from './breach-operations.ts';
import {stabilizationSummary} from './breach-casualty-status.ts';
import {attributableCivilianHarm} from './breach-civilian-harm.ts';
import {assessDispatchForce} from './dispatch-force-review.ts';
import {captureVitalStatus} from './breach-capture-vitals.ts';
import {deriveOperationOutcome,deployedTeam} from './breach-operation-outcomes.ts';
import {verifiedMissingPersonRecovery} from './breach-missing-recovery.ts';
import {optionalIntelRecovered} from './breach-optional-intel.ts';


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
 if(s.site?.training)return 'TRAINING · '+s.site.name+' · PRACTICE';
  if(s.phase==='won')return 'COMPLETE — OPERATION SUCCESS';
  if(s.phase==='lost')return s.withdrawalCompleted?'SQUAD WITHDRAWN':'MISSION FAILED';
  if(s.withdrawalRequested)return 'WITHDRAWAL · '+
    (s.extractedOperators?.length??0)+' EXTRACTED • MOVE REMAINING SQUAD TO EXIT';
  if(s.missingRecoveryTargetId)return 'RECOVER MISSING OPERATOR · DRAG OR CARRY TO EXTRACTION';
  if(s.mission==='clear')return s.missionType==='capture'?
    'TAKE TARGET ALIVE · RESTRAIN OR TREAT IF DOWN':
    'CLEAR HOSTILES • SECURE OBJECTIVE';
  if(s.mission==='secure')return s.missionType==='hold'?
    'HOLD OBJECTIVE • '+Math.floor(s.holdTime)+'/7 SECONDS':
    s.missionType==='rescue'?'REACH PERSON IN TARGET ROOM':
    s.missionType==='intel'?'RECOVER INTELLIGENCE • '+
      s.holdTime.toFixed(1)+'/1.2s':
    s.missionType==='capture'?
      'SECURE TARGET · CHECK VITALS · TREAT IF BLEEDING':
    'SECURE OBJECTIVE';
  if(s.missionType==='capture')return 'EXTRACT LIVING CAPTIVE · TREAT IF BLEEDING · ESCORT/DRAG/CARRY';
  return s.missionType==='intel'?
    'RETURN TO EXTRACTION · INTEL CARRIER MUST EXIT':
    s.missionType==='rescue'?
    'ESCORT OR TRANSPORT PERSON TO EXTRACTION':
    'RETURN TO EXTRACTION OUTSIDE';
}
export function debrief(s:Session){
  const own=deployedTeam(s);
  const operationOutcome=deriveOperationOutcome(s);
  const missingPersonRecovery=verifiedMissingPersonRecovery(s);
  const recoveredIntel=optionalIntelRecovered(s);
  const casualties=own.filter(a=>a.health<=0).length;
  const casualtyCare=stabilizationSummary(own);
  const evacuated=operationOutcome.evacuatedCasualtyIds;
  const shots=own.reduce((t,a)=>t+a.shots,0);
  const hits=own.reduce((t,a)=>t+a.hits,0);
  const target=enemies(s).find(e=>e.id===s.captureTarget);
  const captureVitals=target?captureVitalStatus(target):'unverified';
  const captureOutcome=s.missionType!=='capture'?'not-applicable':
    captureVitals==='deceased'?'deceased':
    s.phase==='won'&&s.captureSecured?captureVitals:
    s.captureSecured?'secured-not-extracted':
    captureVitals==='unverified'?'unverified':'not-secured';
  const rescuePerson=s.civilians.find(c=>c.rescueTarget);
  const rescueStatus=!rescuePerson?'none':
    s.mission!=='done'?'not-extracted':
    rescuePerson.health<=0?'incapacitated':
    rescuePerson.injuryStage>0?'injured':'healthy';
  const civilianInjured=s.civilians.filter(c=>c.health>0&&
    c.injuryStage>0).length;
  const civilianDown=s.civilians.filter(c=>c.health<=0).length;
  // Retrospective outcome categories reflect final AUTHORITATIVE civilian
  // states. SECURE is not RESTRAIN, and escorting remains a separate action.
  // Counts do not change score/mission completion or live fog disclosure.
  const civilianContact={
    frightened:s.civilians.filter(c=>c.health>0&&
      ['attentive','startled','frozen','fleeing','hiding'].includes(c.state)).length,
    secured:s.civilians.filter(c=>c.health>0&&
      c.state==='compliant'&&c.restrained!==true).length,
    restrained:s.civilians.filter(c=>c.health>0&&
      c.state==='compliant'&&c.restrained===true).length,
    escorted:s.civilians.filter(c=>c.health>0&&c.state==='escorted').length
  };
  const attributable=attributableCivilianHarm(s.civilianHarmEvents);
  // Retrospective only: the reviewer never feeds AI, fog, or score rules.
  const forceReview=assessDispatchForce(s.civilianHarmEvents,s.battleEvents);
  // Count distinct physical evidence and current custody, not UI commands.
  const allSuspects=[...enemies(s),...(s.extractedSuspects??[])];
  const interventionCounts={
    weaponsSecured:(s.droppedFirearms??[]).filter(w=>w.status==='secured').length,
    suspectsRestrained:allSuspects.filter(e=>e.restrained&&captureVitalStatus(e)!=='deceased').length,
    personsStabilized:[...own,...allSuspects].filter(a=>
      captureVitalStatus(a)!=='deceased'&&a.medical.wounds.some(w=>w.stabilized)&&
      !a.medical.wounds.some(w=>w.bleeding>0&&!w.stabilized)).length,
    suspectsExtracted:(s.extractedSuspects?.length??0)+(s.missionType==='capture'&&s.phase==='won'&&s.captureSecured?1:0),
    casualtiesEvacuated:evacuated.length,
    intelligenceRecovered:recoveredIntel.length
  };
  const assessment=assessOperation({
    outcome:s.phase==='won'?'success':'failure',
    disposition:operationOutcome.disposition,
    evacuatedCasualties:operationOutcome.evacuatedCasualtyIds.length,
    recoveredIntel:recoveredIntel.length,
    weaponsSecured:interventionCounts.weaponsSecured,
    suspectsRestrained:interventionCounts.suspectsRestrained,
    suspectsExtracted:interventionCounts.suspectsExtracted,
    personsStabilized:interventionCounts.personsStabilized,
    kind:s.missionType as OperationKind,
    elapsed:Math.floor(s.seconds),casualties,teamSize:own.length,
    shots,hits,objective:operationOutcome.objectiveSecured,
    targetSurrendered:target?.surrendered??false,
    captureOutcome:s.missionType==='capture'?captureOutcome:undefined,
    civilianInjured,civilianDown,
    civilianPlayerInjured:attributable.injured,
    civilianPlayerDown:attributable.down,
    extracted:operationOutcome.extractedOperatorIds.length,
  },true);
  return {result:s.phase,operationOutcome,interventionCounts,
    missingPersonRecovery,
    optionalIntel:{total:s.optionalIntel?.length??0,
      discovered:s.optionalIntel?.filter(i=>i.discovered).length??0,
      collected:s.optionalIntel?.filter(i=>i.collectedBy!==null).length??0,
      recovered:recoveredIntel.length,
      itemIds:recoveredIntel.map(i=>i.id)},
    time:Math.floor(s.seconds),casualties,
    stabilizedCasualties:casualtyCare.stabilized,
    criticalCasualties:casualtyCare.critical,
    evacuatedCasualties:evacuated,
    shots,hits,civilianInjured,civilianDown,rescueStatus,
    civilianContact,
    civilianPlayerInjured:attributable.injured,
    civilianPlayerDown:attributable.down,
    kills:own.reduce((t,a)=>t+a.kills,0),
    pauses:s.timesPaused,variant:s.scenario.name,
    objective:operationOutcome.objectiveSecured,
    type:s.missionType,
    grade:assessment.grade,score:assessment.score,
    scoreComponents:assessment.scoreComponents,
    forceReview,
    accuracy:assessment.accuracy,survived:assessment.survived,
    squad:own.map(a=>({id:a.id,name:a.name,
      survived:a.health>0,injury:a.injuryStage,
      fired:a.shots,hits:a.hits})),
    captureSecured:s.captureSecured,
    captureVitals,captureOutcome,
    captureDeathAt:target?.deathAt??null,
    captureDownedAt:target?.downedAt??null,
    rescueExtracted:!!s.rescue&&s.phase==='won',
    intelCarrier:s.intelCarrierId};
}
