/** Pure mission briefing, status copy and After Action assessment.
 * Reads authoritative Session evidence; does not mutate the simulation or
 * replay. Isolated from frame/render state to keep reporting truthful.
 */
import type {Session} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {team,enemies} from './breach-session-selectors.ts';
import {operationBrief,assessOperation,type OperationKind} from './breach-operations.ts';
import {stabilizationSummary} from './breach-casualty-status.ts';
import {attributableCivilianHarm} from './breach-civilian-harm.ts';

const near=(a:Pt,b:Pt,range:number)=>Math.hypot(a.x-b.x,a.y-b.y)<=range;

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
