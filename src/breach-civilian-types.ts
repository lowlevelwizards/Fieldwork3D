/** Neutral people are NOT TeamActor and carry no gun, ammo, targeting,
 * enemy orders or hostile affiliation. Their physical movement is separately
 * validated against the same tactical world. */
import type {Pt} from './breach-core.ts';
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
  routine:Pt[];routineIndex:number;dwellUntil:number;
  goal:Pt|null;nav:Pt[];blockedTime:number;retryAt:number;
  homeRoomId:string;homeZoneId:string|null;appearanceSeed:number;
  rescueTarget:boolean;following:string|null;
};
export function createCivilian(spec:CivilianSpec):CivilianActor{
  return {
    id:spec.id,role:spec.role,persona:spec.persona,
    activity:spec.activity,p:{...spec.position},priorP:{...spec.position},
    heading:spec.heading,velocity:0,radius:10,
    health:2,injuryStage:0,state:'routine',stateSince:0,fear:0,
    lastEvidenceAt:-1,lastEvidenceId:null,lastHitAt:-100,
    routine:(spec.routine??[]).map(p=>({...p})),
    routineIndex:0,dwellUntil:0,goal:null,nav:[],
    blockedTime:0,retryAt:0,homeRoomId:spec.roomId,
    homeZoneId:spec.zoneId??null,appearanceSeed:spec.appearanceSeed,
    rescueTarget:!!spec.isRescueTarget,following:null
  };
}
