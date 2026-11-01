/** Build 22: bounded mission wound records. The game keeps the existing
 * injury/health authority; wounds add deterministic treatable deterioration.
 * Rates are game-balance coefficients, not medical treatment guidance.
 */
import type {WoundRegion} from './breach-wounds.ts';
export type BleedGrade=0|1|2|3;
export type WoundRecord={
 id:number;region:WoundRegion;severity:1|2;
 bleeding:BleedGrade;stabilized:boolean;createdAt:number;
 treatments:number;
};
export type MedicalCondition={
 wounds:WoundRecord[];bloodLoss:number;
};
export const newMedicalCondition=():MedicalCondition=>({wounds:[],bloodLoss:0});
export function bleedingGrade(region:WoundRegion,severity:number,seed:number):BleedGrade{
 if(severity<=0)return 0;
 // Some hits cause little external bleeding, and armor blocks have none.
 if(severity===1)return seed%5===0?0:seed%3===0?2:1;
 return seed%4===0?2:3;
}
export function registerWound(state:MedicalCondition,shotId:number,region:WoundRegion,
 severity:number,at:number):void{
 if(severity<=0||state.wounds.some(w=>w.id===shotId))return;
 const record:WoundRecord={id:shotId,region,severity:severity>=2?2:1,
  bleeding:bleedingGrade(region,severity,shotId),stabilized:false,
  createdAt:at,treatments:0};
 if(state.wounds.length<4)state.wounds.push(record);
 else{
  const worst=state.wounds.reduce((best,w)=>w.bleeding>best.bleeding?w:best);
  worst.bleeding=Math.max(worst.bleeding,record.bleeding) as BleedGrade;
  worst.severity=2;
 }
}
export function bleedingRate(state:MedicalCondition):number{
 return state.wounds.reduce((sum,w)=>sum+(w.stabilized?0:
  [0,.0017,.004,.009][w.bleeding]),0);
}
/** Returns the number of irreversible injury-stage thresholds crossed. */
export function advanceMedicalCondition(state:MedicalCondition,dt:number):number{
 const old=Math.floor(state.bloodLoss);
 state.bloodLoss=Math.max(0,Math.min(3,state.bloodLoss+
  bleedingRate(state)*Math.max(0,Math.min(dt,1/30))));
 return Math.floor(state.bloodLoss)-old;
}
export function stabilizeWound(state:MedicalCondition,id:number):boolean{
 const wound=state.wounds.find(w=>w.id===id);
 if(!wound||wound.stabilized||wound.bleeding===0)return false;
 wound.stabilized=true;wound.treatments++;return true;
}
export const mostUrgentWound=(state:MedicalCondition):WoundRecord|undefined=>
 state.wounds.filter(w=>!w.stabilized&&w.bleeding>0).sort((a,b)=>
  b.bleeding-a.bleeding||a.createdAt-b.createdAt)[0];
export function copyMedicalCondition(state:MedicalCondition):MedicalCondition{
 return {bloodLoss:state.bloodLoss,wounds:state.wounds.map(w=>({...w}))};
}
