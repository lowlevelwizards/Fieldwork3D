/** D11: bounded, evidence-aware departmental progression.
 * Pure post-operation settlement. This has no combat/fog/ROE authority.
 * Dispatch standing records operational outcomes, never legal culpability.
 */
import type {CampaignReport} from './campaign-state.ts';

export const DISPATCH_RECOGNITIONS=[
 'CONSISTENT RESPONSE','SUSTAINED SERVICE','SURRENDER RESOLUTIONS'
] as const;
export type DispatchRecognition=typeof DISPATCH_RECOGNITIONS[number];
export type DispatchDepartmentV1=Readonly<{
 version:1;standing:number;responses:number;successful:number;
 reviewed:number;harmResponses:number;surrenders:number;
 operatingSupport:number;recognitions:readonly DispatchRecognition[];
}>;
export type DispatchCareerReceiptV1=Readonly<{
 version:1;standingBefore:number;standingDelta:number;standingAfter:number;
 operatingSupport:number;reviewed:boolean;
 recognitions:readonly DispatchRecognition[];
}>;
export const STARTING_DISPATCH_STANDING=50;
const MAX_RECORDS=1000000;
const LIMIT_SUPPORT=1000000000;
const bounded=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const whole=(n:unknown,max:number):n is number=>
 typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max;
const object=(v:unknown):v is Record<string,unknown>=>
 v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:readonly string[])=>
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const recognitions=(v:unknown):v is readonly DispatchRecognition[]=>
 Array.isArray(v)&&v.length<=DISPATCH_RECOGNITIONS.length&&
 new Set(v).size===v.length&&v.every(x=>DISPATCH_RECOGNITIONS.includes(
 x as DispatchRecognition));

export function initialDispatchDepartment():DispatchDepartmentV1{
 return {version:1,standing:STARTING_DISPATCH_STANDING,responses:0,
  successful:0,reviewed:0,harmResponses:0,surrenders:0,
  operatingSupport:0,recognitions:[]};
}
export function validDispatchDepartment(value:unknown):
 value is DispatchDepartmentV1{
 if(!object(value)||!exact(value,['version','standing','responses',
  'successful','reviewed','harmResponses','surrenders',
  'operatingSupport','recognitions']))return false;
 return value.version===1&&whole(value.standing,100)&&
  whole(value.responses,MAX_RECORDS)&&whole(value.successful,MAX_RECORDS)&&
  value.successful<=value.responses&&whole(value.reviewed,MAX_RECORDS)&&
  value.reviewed<=value.responses&&whole(value.harmResponses,MAX_RECORDS)&&
  value.harmResponses<=value.reviewed&&whole(value.surrenders,MAX_RECORDS)&&
  whole(value.operatingSupport,LIMIT_SUPPORT)&&recognitions(value.recognitions);
}
export function validDispatchCareerReceipt(value:unknown):
 value is DispatchCareerReceiptV1{
 if(!object(value)||!exact(value,['version','standingBefore','standingDelta',
  'standingAfter','operatingSupport','reviewed','recognitions']))return false;
 return value.version===1&&whole(value.standingBefore,100)&&
  whole(value.standingAfter,100)&&
  typeof value.standingDelta==='number'&&Number.isInteger(value.standingDelta)&&
  value.standingDelta>=-32&&value.standingDelta<=9&&
  value.standingAfter===bounded(value.standingBefore+value.standingDelta,0,100)&&
  whole(value.operatingSupport,200)&&typeof value.reviewed==='boolean'&&
  recognitions(value.recognitions);
}
export function dispatchStandingTier(standing:number):string{
 return standing>=85?'EXPERIENCED':standing>=65?'ESTABLISHED':
  standing>=40?'DEVELOPING':'RECOVERING';
}
export function advanceDispatchDepartment(
 previous:DispatchDepartmentV1|undefined,
 report:Pick<CampaignReport,'outcome'|'grade'|'objective'|'casualties'|'dispatchForce'>
):{state:DispatchDepartmentV1;receipt:DispatchCareerReceiptV1}{
 const before=previous??initialDispatchDepartment();
 const success=report.outcome==='success';
 const reviewed=report.dispatchForce!==undefined;
 const harm=report.dispatchForce;
 const documentedInjuries=harm?.blueCivilianInjured??0;
 const documentedDown=harm?.blueCivilianDown??0;
 const hadHarm=reviewed&&(documentedInjuries>0||documentedDown>0);
 // Performance grades already account for actual civilian harm and
 // casualties in the mission score. This separate standing is descriptive,
 // with no legal/disciplinary interpretation and NO monetary fine.
 const gradeBonus=success&&report.objective?
  report.grade==='A'?2:report.grade==='B'?1:0:0;
 const requestedDelta=(success?5:-4)+(report.objective?1:0)+gradeBonus-
  Math.min(3,new Set(report.casualties).size)*2-
  Math.min(22,documentedInjuries*5+documentedDown*11)+
  (success&&report.objective&&reviewed&&!hadHarm?1:0);
 const standing=bounded(before.standing+requestedDelta,0,100);
 // Existing contract reward remains unchanged; these are modest,
 // fully bounded post-operation *operating support* credits.
 const gradeSupport=success&&report.objective?
  report.grade==='A'?100:report.grade==='B'?65:
  report.grade==='C'?35:report.grade==='D'?15:0:0;
 const operatingSupport=gradeSupport===0?0:
  gradeSupport+(standing>=85?40:standing>=65?20:0);
 const responses=Math.min(MAX_RECORDS,before.responses+1);
 const successful=Math.min(MAX_RECORDS,before.successful+(success?1:0));
 const countReviewed=Math.min(MAX_RECORDS,before.reviewed+(reviewed?1:0));
 const harmResponses=Math.min(MAX_RECORDS,before.harmResponses+(hadHarm?1:0));
 const surrenders=Math.min(MAX_RECORDS,before.surrenders+
  Math.max(0,harm?.surrenders??0));
 const eligible:DispatchRecognition[]=[];
 if(successful>=3)eligible.push('CONSISTENT RESPONSE');
 if(responses>=10)eligible.push('SUSTAINED SERVICE');
 if(surrenders>=3)eligible.push('SURRENDER RESOLUTIONS');
 const awards=eligible.filter(a=>!before.recognitions.includes(a));
 const state:DispatchDepartmentV1={
  version:1,standing,responses,successful,reviewed:countReviewed,
  harmResponses,surrenders,
  operatingSupport:Math.min(LIMIT_SUPPORT,before.operatingSupport+operatingSupport),
  recognitions:[...before.recognitions,...awards]
 };
 return {state,receipt:{
  version:1,standingBefore:before.standing,
  standingDelta:standing-before.standing,standingAfter:standing,
  operatingSupport,reviewed,recognitions:awards
 }};
}
