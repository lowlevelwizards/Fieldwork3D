/** Per-session, per-door UI choice only; never writes a plan or motor.
 * A formation is authored only when the player taps STACK or SQUAD ENTRY.
 * Weak session keys prevent an old mission's preference leaking forward.
 */
import type {Session} from './breach-game.ts';
import type {StackFormation} from './breach-entry-coordination.ts';
export const STACK_FORMATION_CYCLE:readonly StackFormation[]=
 ['auto','left','right','split','angled'];
const selections=new WeakMap<Session,Map<string,StackFormation>>();
export function selectedDoorStackFormation(s:Session,doorId:string):StackFormation{
 return selections.get(s)?.get(doorId)??'auto';
}
export function cycleDoorStackFormation(s:Session,doorId:string):StackFormation{
 const value=selectedDoorStackFormation(s,doorId);
 const index=STACK_FORMATION_CYCLE.indexOf(value);
 const next=STACK_FORMATION_CYCLE[(index+1)%STACK_FORMATION_CYCLE.length];
 let map=selections.get(s);
 if(!map){map=new Map();selections.set(s,map);}
 map.set(doorId,next);return next;
}
