/** MF-4 attention policy: no world-truth queries and no simulation writes.
 * All decisions here operate on already-disclosed camera/UI evidence.
 */
export type FocusImportance='critical'|'sight'|'recent'|'context'|'background';
export type FocusDisc={x:number;y:number;radius:number;priority:FocusImportance};
export type FocusScreenPoint={x:number;y:number};
/** Screen-space corner blur is reduced when the player focuses tightly on
 * a room. Wide overview retains the miniature look. All bounds are finite.
 */
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const smoothstep=(a:number,b:number,x:number)=>{
 const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);
};
export function focusZoomMultiplier(zoomRatio:number,roomCoverage=0):number{
 if(!Number.isFinite(zoomRatio)||!Number.isFinite(roomCoverage))return 0;
 const closeUp=smoothstep(1.17,1.95,zoomRatio);
 const framedRoom=smoothstep(.22,.52,roomCoverage);
 return clamp(1-Math.max(closeUp,framedRoom),0,1);
}
/** Visibility overrides optics. No undisclosed entity participates. */
export const FOCUS_PROTECTION:Record<FocusImportance,number>={
 critical:1,sight:1,recent:.94,context:.72,background:0
};
/** Minimum 2.4 seconds of guaranteed new-reveal protection; easing down
 * over an additional 1.2 sec, rather than a hard frame toggle. */
export function recentRevealWeight(age:number):number{
 if(!Number.isFinite(age)||age<0)return 0;
 return age<=2.4?1:1-smoothstep(2.4,3.6,age);
}
/** Immediate acquisition, gentle release (dead zones fade rather than pop).
 * Samples run at ~10 Hz; inputs must be clamped and bounded.
 */
export function attentionRelease(previous:number,target:number,dt:number):number{
 if(![previous,target,dt].every(Number.isFinite))return 0;
 const safePrevious=clamp(previous,0,1),safeTarget=clamp(target,0,1);
 if(safeTarget>=safePrevious)return safeTarget;
 const retention=Math.exp(-Math.max(0,Math.min(dt,.25))/.52);
 return safeTarget+(safePrevious-safeTarget)*retention;
}
/** Strongly contrast-separated pixels are probably silhouettes, opaque fog
 * or hidden-room boundaries. Suppress color exchange across them. */
export function focusFogBoundaryGuard(maxColorDifference:number):number{
 if(!Number.isFinite(maxColorDifference))return 0;
 return 1-smoothstep(.11,.29,maxColorDifference);
}
