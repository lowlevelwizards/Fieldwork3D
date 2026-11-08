/** MF-3: focus coverage depends ONLY on screen height, not on world bounds. */
export type FocusPoint={x:number;y:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smoothstep=(a:number,b:number,v:number)=>{
 const t=clamp((v-a)/(b-a),0,1);
 return t*t*(3-2*t);
};
/** yNormalized is 0 at the TOP of the screen, 1 at the bottom.
 * Entire central band remains native/sharp. Top and bottom progressively
 * reach full blur even when the entire map fills the viewport.
 */
export function tiltShiftCoverage(yNormalized:number,center:number,
 innerHalfHeight:number,outerHalfHeight:number):number{
 if(![yNormalized,center,innerHalfHeight,outerHalfHeight]
  .every(Number.isFinite)||innerHalfHeight<0||
  outerHalfHeight<=innerHalfHeight)return 0;
 return smoothstep(innerHalfHeight,outerHalfHeight,
   Math.abs(yNormalized-center));
}
/** Optional replay-only focus drift. A 8%-height deadzone and sub-second
 * smoothing prevent hunting at every contact or micro camera movement.
 * A seek/cut caller may reset current directly to .54.
 */
export function nextReplayTiltShiftCenter(current:number,target:number,
 dt:number,deadzone=.08):number{
 if(!Number.isFinite(current)||!Number.isFinite(target)||
  !Number.isFinite(dt)||dt<=0)return Number.isFinite(current)?current:.54;
 const desired=clamp(target,.44,.68);
 const delta=desired-current;
 if(Math.abs(delta)<=deadzone)return current;
 const leavingTarget=desired-Math.sign(delta)*deadzone;
 const alpha=1-Math.exp(-Math.min(dt,.15)/.60);
 return clamp(current+(leavingTarget-current)*alpha,.44,.68);
}
