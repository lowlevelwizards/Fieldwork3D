/** D3.9B1: one short-footstep state for explicit/implicit opening.
 * This is transient intent; the existing motor owns all movement.
 */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
export type OpeningFootwork={
 readonly doorId:string;readonly orderId:number;readonly kind:'stance'|'swing';
 target:Pt|null;attempts:number;nextAt:number
};
const steps=new WeakMap<TeamActor,OpeningFootwork>();
export function openingFootwork(a:TeamActor,doorId:string,orderId:number,
 kind:OpeningFootwork['kind']):OpeningFootwork{
 const old=steps.get(a);
 if(old&&old.doorId===doorId&&old.orderId===orderId&&old.kind===kind)
  return old;
 const state:OpeningFootwork={doorId,orderId,kind,target:null,attempts:0,nextAt:0};
 steps.set(a,state);return state;
}
export function clearOpeningFootwork(a:TeamActor,doorId:string,orderId:number):void{
 const state=steps.get(a);
 if(state?.doorId===doorId&&state.orderId===orderId)steps.delete(a);
}
export function setOpeningFootstep(a:TeamActor,state:OpeningFootwork,target:Pt):void{
 state.target={...target};steps.set(a,state);
}
export function queueOpeningFootstep(a:TeamActor,target:Pt):void{
 if(!a.nav.length||Math.hypot(a.nav[0].x-target.x,a.nav[0].y-target.y)>=3.5)
  a.nav.unshift({...target});
}
