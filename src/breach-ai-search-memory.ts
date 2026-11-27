/** Bounded, personal inspection records. A received area-clear message
 * is not a target observation, and fresh evidence supersedes old checks. */
import type {Pt} from './breach-core.ts';
export type CheckedArea={p:Pt;at:number;source:'personal'|'report'};
const nearby=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y)<26;
export function recentlyChecked(areas:readonly CheckedArea[],p:Pt,now:number,newEvidenceAt:number):boolean{
 return areas.some(a=>a.at>=newEvidenceAt&&now>=a.at&&now-a.at<25&&nearby(a.p,p));
}
export function rememberChecked(areas:CheckedArea[],p:Pt,now:number,
 newEvidenceAt:number,source:CheckedArea['source']):boolean{
 if(recentlyChecked(areas,p,now,newEvidenceAt))return false;
 areas.push({p:{...p},at:now,source});
 if(areas.length>16)areas.shift();
 return true;
}

/** A route failure is not evidence that an area has been inspected. */
export function canRecordInspection(recovering:boolean,remainingDistance:number,now:number,pauseUntil:number):boolean{
 return !recovering&&remainingDistance<35&&pauseUntil>0&&now>=pauseUntil;
}
