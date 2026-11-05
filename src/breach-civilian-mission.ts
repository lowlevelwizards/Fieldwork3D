/** Real neutral rescue identity and physical handoff rules.
 * No teleport, global rescue permission, or duplicated puppet figure. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function canSecureRescuePerson(
 person:CivilianActor,rescuer:{p:Pt;health:number},
 clear:(a:Pt,b:Pt)=>boolean):boolean{
 return person.rescueTarget&&person.health>0&&rescuer.health>0&&
   dist(person.p,rescuer.p)<=28&&clear(person.p,rescuer.p);
}
export function rescueEscortSeparated(person:CivilianActor,
 rescuer:{p:Pt;health:number}|null):boolean{
 return !rescuer||rescuer.health<=0||person.health<=0||
   dist(person.p,rescuer.p)>125;
}
export function rescueFollowGoal(
 rescuer:{p:Pt;heading:number}):Pt{
 return {x:rescuer.p.x-23*Math.cos(rescuer.heading),
   y:rescuer.p.y-23*Math.sin(rescuer.heading)};
}
