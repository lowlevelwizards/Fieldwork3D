/** D3.13A: observe real angular APERTURE progress, not motor intent or
 * instantaneous angular velocity. A hinge oscillating at a fixed aperture
 * must not hold four MOVEs indefinitely while reporting no blocked time.
 * WeakMap lifetime is exactly the physical door, never a global seed.
 */
import type {Door} from './breach-core.ts';

type Sample={observedAt:number;bestFraction:number;advancedAt:number};
const samples=new WeakMap<Door,Sample>();
export const OPENING_PROGRESS_GRACE_SECONDS=2.6;
const MIN_APERTURE_GAIN=.012;

/** True only for a genuinely stagnant, partially open, operable hinge.
 * Returns permission to try the ORDINARY motor; it NEVER opens the hinge,
 * skips collision, reorders the squad, cancels orders or teleports actors.
 */
export function openingHasStagnated(door:Door,now:number):boolean{
 const fraction=door.openFraction??(door.open?1:0);
 if(!Number.isFinite(now)||!Number.isFinite(fraction)||
    !door.open||door.locked||door.wedged||door.heldBy||
    fraction<.15||fraction>=.72){
  samples.delete(door);return false;
 }
 const prior=samples.get(door);
 // A new clock/replay seek, a large observation gap or a newly closed
 // and reopened leaf must never inherit the previous opening timeout.
 if(!prior||now<prior.observedAt-.01||
    now-prior.observedAt>.6||
    fraction<prior.bestFraction-.025){
  samples.set(door,{observedAt:now,bestFraction:fraction,advancedAt:now});
  return false;
 }
 prior.observedAt=now;
 if(fraction>=prior.bestFraction+MIN_APERTURE_GAIN){
  prior.bestFraction=fraction;
  prior.advancedAt=now;
 }
 return now-prior.advancedAt>=OPENING_PROGRESS_GRACE_SECONDS;
}
