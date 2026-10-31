/** Build 155: compact operation contracts and after-action continuity.
 * Procedural geometry remains authoritative. A briefing contains mission
 * intent and building intelligence, never undiscovered enemy coordinates.
 */
export type OperationKind='clear'|'intel'|'rescue'|'hold'|'capture';
export type OperationBrief={
  code:string;name:string;objective:string;condition:string;
  extraction:string;notes:string;
};
export const BRIEFS:Record<OperationKind,OperationBrief>={
  clear:{
    code:'ROOM SWEEP',name:'Clear & Secure',
    objective:'Neutralize active defenders, then secure the marked objective.',
    condition:'All hostile threats neutralized; objective reached.',
    extraction:'Withdraw one or more surviving operators to extraction.',
    notes:'Suspected hostiles. Number and exact positions unconfirmed.',
  },
  intel:{
    code:'DOCUMENT RECOVERY',name:'Recover Intelligence',
    objective:'Reach the marked intelligence cache and secure its contents.',
    condition:'Hold the cache briefly to finish evidence collection.',
    extraction:'Withdraw a surviving operator with the recovered intelligence.',
    notes:'Avoid unnecessary engagement. Intel location may be approximate.',
  },
  rescue:{
    code:'PERSONNEL EXTRACTION',name:'Rescue & Escort',
    objective:'Locate and make contact with the person at the marked location.',
    condition:'A surviving operator must make contact with the rescue target.',
    extraction:'Escort the person to the extraction point.',
    notes:'Keep an escort alive; losing the escort breaks the formation.',
  },
  hold:{
    code:'DEFENSIVE ACTION',name:'Secure & Hold',
    objective:'Reach the designated location and defend it.',
    condition:'Hold for seven cumulative uncontested seconds.',
    extraction:'Withdraw once the hold is secure.',
    notes:'Enemies near the objective interrupt the hold clock.',
  },
  capture:{
    code:'TARGET RECOVERY',name:'Target Capture',
    objective:'Neutralize the designated target and secure their position.',
    condition:'Target disabled or surrendered; operator secures the body.',
    extraction:'Extract after the target is secured.',
    notes:'Surrendered targets score better than targets incapacitated by gunfire.',
  }
};
export const operationBrief=(kind:OperationKind)=>BRIEFS[kind];
export type OperationAssessment={
  outcome:'success'|'failure';kind:OperationKind;elapsed:number;
  casualties:number;teamSize:number;shots:number;hits:number;
  objective:boolean;targetSurrendered?:boolean;extracted:number;
};
export function assessOperation(data:OperationAssessment){
  const accuracy=data.shots?
    Math.round(data.hits/data.shots*100):0;
  const survived=Math.max(0,data.teamSize-data.casualties);
  let score=data.outcome==='success'?78:20;
  if(data.objective)score+=12;
  score+=Math.round(12*survived/Math.max(1,data.teamSize));
  score-=data.casualties*13;
  if(data.elapsed>180)score-=Math.min(12,Math.floor((data.elapsed-180)/30));
  if(data.kind==='capture'&&data.targetSurrendered)score+=8;
  if(data.kind==='rescue'&&data.extracted===0)score-=20;
  score=Math.max(0,Math.min(100,score));
  const grade=data.outcome==='failure'?'F':
    score>=90?'A':score>=78?'B':score>=62?'C':'D';
  return {grade,score,accuracy,survived};
}
export type OperationRecord={
  seed:number;kind:OperationKind;outcome:'success'|'failure';
  grade:string;elapsed:number;casualties:number;
};
export const HISTORY_LIMIT=12;
export function parseOperationHistory(text:string|null):OperationRecord[]{
  if(!text)return [];
  try{
    const data:unknown=JSON.parse(text);
    if(!Array.isArray(data))return [];
    return data.filter((a):a is OperationRecord=>
      a&&typeof a==='object'&&
      Number.isFinite(a.seed)&&typeof a.kind==='string'&&
      ['clear','intel','rescue','hold','capture'].includes(a.kind)&&
      (a.outcome==='success'||a.outcome==='failure')&&
      typeof a.grade==='string'&&Number.isFinite(a.elapsed)&&
      Number.isFinite(a.casualties)).slice(-HISTORY_LIMIT);
  }catch{return [];}
}
export function addOperationRecord(history:readonly OperationRecord[],
 record:OperationRecord):OperationRecord[]{
  return [...history,record].slice(-HISTORY_LIMIT);
}
