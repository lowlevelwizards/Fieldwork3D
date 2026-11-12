/** Short-lived facing intent for automatic motor detours.
 * Navigation and collision retain sole ownership of actor translation.
 * This only stops temporary clearance steps becoming full-body turns.
 */
import type {Pt} from './breach-core.ts';

export type AutoSidestep={facing:number;goal:Pt;until:number};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const yaw=(a:Pt,b:Pt)=>Math.atan2(b.y-a.y,b.x-a.x);
const difference=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

/** Begin only when already traveling roughly in the original direction and
 * the new leg is a SHORT, substantially lateral correction, not a true
 * hallway corner, reverse move or authored turn.
 */
export function beginAutoSidestep(
 from:Pt,original:Pt,detour:Pt,heading:number,goal:Pt,
 now:number,enabled:boolean
):AutoSidestep|null{
 if(!enabled||!Number.isFinite(now)||
   distance(from,original)<2||distance(from,detour)<.2||
   distance(from,detour)>56)return null;
 const intended=yaw(from,original),avoiding=yaw(from,detour);
 const deviation=Math.abs(difference(avoiding,intended));
 if(Math.abs(difference(heading,intended))>.48||
   deviation<.48||deviation>2.10)return null;
 return {facing:heading,goal:{...goal},until:now+1.25};
}

/** Release as soon as the ordinary route heads forward again, or at the
 * hard deadline. Never hold an old facing for a new destination.
 * Authored LOOK/WATCH, contact, running and mandatory squeeze take priority.
 */
export function autoSidestepFacing(
 step:AutoSidestep|null,from:Pt,next:Pt|undefined,goal:Pt,
 now:number,enabled:boolean
):number|null{
 if(!step||!enabled||!next||now>=step.until||
    distance(goal,step.goal)>3||distance(from,next)<.5)return null;
 const movement=yaw(from,next);
 if(Math.abs(difference(movement,step.facing))<.26)return null;
 return step.facing;
}

/** The feet can correct a short collision blockage while the upper-body
 * authored WATCH remains separate. No hidden obstacle, teleport, or
 * alternative tactical goal: the existing world sweep remains authoritative.
 */
export function watchClearanceAllowed(from:Pt,candidate:Pt,goal:Pt,
 watching:boolean,sweptClear:(a:Pt,b:Pt)=>boolean):boolean{
 if(!watching)return true;
 if(!Number.isFinite(candidate.x+candidate.y)||distance(from,candidate)>40||
    distance(from,candidate)<.5||
    distance(candidate,goal)>distance(from,goal)+12)return false;
 return sweptClear(from,candidate);
}
