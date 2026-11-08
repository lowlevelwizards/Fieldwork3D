/** Replay R7: tactile detents and time-correct rate easing.
 * This affects presentation time only; recorded samples stay immutable.
 */
export const REPLAY_SPEED_STOPS=[
  .25,.5,.75,1,1.25,1.5,1.75,2,2.5,3,3.5,4
] as const;
export const REPLAY_SPEED_MAJOR=[1,1.5,2,4] as const;
export function speedIndex(value:number):number{
  const index=REPLAY_SPEED_STOPS.findIndex(s=>s===value);
  if(index>=0)return index;
  let closest=0,delta=Infinity;
  for(let i=0;i<REPLAY_SPEED_STOPS.length;i++){
    const d=Math.abs(value-REPLAY_SPEED_STOPS[i]);
    if(d<delta){closest=i;delta=d;}
  }
  return closest;
}
export function speedFromIndex(index:number):number{
  const safe=Number.isFinite(index)?
    Math.min(REPLAY_SPEED_STOPS.length-1,Math.max(0,Math.round(index))):3;
  return REPLAY_SPEED_STOPS[safe];
}
/** Exponential monotonic convergence to new rate. No negative/invalid speed. */
export function smoothReplaySpeed(current:number,target:number,dt:number):number{
  if(!Number.isFinite(target))return 1;
  const safe=Math.max(.25,Math.min(4,target));
  if(!Number.isFinite(current)||current<=0||dt<0)return safe;
  const alpha=1-Math.exp(-Math.min(.1,Math.max(0,dt))/.19);
  const next=current+(safe-current)*alpha;
  return Math.abs(next-safe)<.004?safe:next;
}
