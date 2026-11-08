/** Neutral people are NOT TeamActor and carry no gun, ammo, targeting,
 * enemy orders or hostile affiliation. Their physical movement is separately
 * validated against the same tactical world. */
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
import type {CivilianSpec} from './worldgen/encounter-types.ts';
export type CivilianState=
  'routine'|'attentive'|'startled'|'frozen'|'fleeing'|'hiding'|
  'compliant'|'escorted'|'wounded'|'incapacitated';
export type CivilianActor={
  id:string;role:CivilianSpec['role'];persona:CivilianSpec['persona'];
  activity:CivilianSpec['activity'];p:Pt;priorP:Pt;
  heading:number;velocity:number;radius:number;
  health:number;injuryStage:number;state:CivilianState;
  stateSince:number;fear:number;lastEvidenceAt:number;
  lastEvidenceId:string|null;lastHitAt:number;
  lastNoiseId:number;lastSenseAt:number;
  lastVisualId:string|null;visualProgress:Record<string,number>;
  threatEstimate:Pt|null;
  routine:Pt[];routineIndex:number;dwellUntil:number;
  /** Known building options are authored from site geometry, not threats. */
  refugePoints:Pt[];
  goal:Pt|null;nav:Pt[];blockedTime:number;retryAt:number;
  homeRoomId:string;homeZoneId:string|null;appearanceSeed:number;
  rescueTarget:boolean;following:string|null;
  /** Operator physically carrying/dragging this body; exclusive custody. */
  carriedById:string|null;
  /** Recorded rendering hint; the evacuation order remains authoritative. */
  transportMode:TransportMode|null;
  lastEscortRouteAt:number;
  /** Set only when applying historical film; never queried by live AI. */
  replayVisible?:boolean;
};
export function createCivilian(spec:CivilianSpec):CivilianActor{
  return {
    id:spec.id,role:spec.role,persona:spec.persona,
    activity:spec.activity,p:{...spec.position},priorP:{...spec.position},
    heading:spec.heading,velocity:0,radius:10,
    health:2,injuryStage:0,state:'routine',stateSince:0,fear:0,
    lastEvidenceAt:-1,lastEvidenceId:null,lastHitAt:-100,
    lastNoiseId:0,lastSenseAt:0,lastVisualId:null,
    visualProgress:{},threatEstimate:null,
    routine:(spec.routine??[]).map(p=>({...p})),
    refugePoints:[],routineIndex:0,dwellUntil:0,goal:null,nav:[],
    blockedTime:0,retryAt:0,homeRoomId:spec.roomId,
    homeZoneId:spec.zoneId??null,appearanceSeed:spec.appearanceSeed,
    rescueTarget:!!spec.isRescueTarget,following:null,carriedById:null,transportMode:null,
    lastEscortRouteAt:-100
  };
}

/** Physical condition is separate from behavior for new decision logic.
 * Retain legacy 'wounded' state for replay/save compatibility. */
export type CivilianCondition='healthy'|'injured'|'incapacitated';
export function civilianCondition(c:CivilianActor):CivilianCondition{
 if(c.health<=0||c.injuryStage>=3)return 'incapacitated';
 if(c.health<2||c.injuryStage>0)return 'injured';
 return 'healthy';
}
/** Reject contradictory transitions before editing any actor state. */
export function setCivilianState(c:CivilianActor,
 state:CivilianState,now:number):boolean{
 const condition=civilianCondition(c);
 if(condition==='incapacitated'&&state!=='incapacitated')return false;
 if(condition==='injured'&&state==='routine'&&
    c.state==='wounded')return false;
 // An explicit FOLLOW may reassign a person already escorted by another
 // operator. Re-entering that state must clear the old escort route too.
 if(c.state===state&&state!=='escorted')return true;
 c.state=state;c.stateSince=now;c.velocity=0;
 if(state==='incapacitated'||state==='compliant'||state==='wounded'||
    state==='escorted'){
  // An explicitly secured or followed person cannot keep a former
  // panic/refuge route. A successful interaction must not begin by
  // walking toward a stale hiding place or honoring an old retry pause.
  c.goal=null;c.nav=[];
 }
 if(state==='compliant'||state==='escorted'){
  c.blockedTime=0;c.retryAt=now;c.dwellUntil=now;
  if(state==='escorted')c.lastEscortRouteAt=-100;
 }
 return true;
}
