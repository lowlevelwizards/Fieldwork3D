/** E5-D2: tactical *known* noncombatant muzzle-volume safety.
 * Callers must pass only presently observed, physically unobstructed people.
 * Do not use this result for acquisition, revealing contacts or shot damage:
 * physical rounds continue to hit ANY real civilian independently. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import {firstCivilianAlongRay} from './breach-civilian-ballistics.ts';

/** Returns the first known civilian physically intercepting the intended
 * segment before its destination, including actual vertical muzzle height. */
export function knownCivilianInFireLane(
 from:Pt,muzzleHeight:number,to:Pt,targetHeight:number,
 observed:readonly CivilianActor[]
):CivilianActor|null{
 const dx=to.x-from.x,dy=to.y-from.y;
 const range=Math.hypot(dx,dy);
 if(!Number.isFinite(range)||range<.01||
    !Number.isFinite(muzzleHeight)||!Number.isFinite(targetHeight))
    return null;
 const hit=firstCivilianAlongRay(from,Math.atan2(dy,dx),range,observed,{
   muzzleHeight,farHeight:targetHeight,farDistance:range
 });
 return hit&&hit.along<range-1?hit.actor:null;
}
