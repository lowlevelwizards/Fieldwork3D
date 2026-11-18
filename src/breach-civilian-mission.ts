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
/** EQA3.1: when the squad member *actually owns* a healthy or injured
 * civilian FOLLOW, ordinary walk should not reliably outpace the person.
 * The operator's regular 53-unit stride is faster than a healthy
 * civilian's real 43-unit escort gait (or 22 when wounded). Modulate only
 * an authorized walk based on measured separation, not enemy intent or
 * invisible geometry. Sprint, explicit breach maneuvers, and carried people
 * are unaffected. Real doors and the motor still gate every footstep.
 */
export function escortWalkMultiplier(
 rescuer:{id:string;p:Pt},
 person:Pick<CivilianActor,'following'|'state'|'health'|'injuryStage'|'p'>|null
):number{
 if(!person||person.following!==rescuer.id||
    person.state!=='escorted'||person.health<=0)return 1;
 const separation=dist(rescuer.p,person.p);
 if(separation<=30)return 1;
 const base=person.health<2||person.injuryStage>0?.39:.78;
 if(separation<=62)return base;
 if(separation<=87)return base*.8;
 return base*.45;
}
export function rescueFollowGoal(
 rescuer:{p:Pt;heading:number}):Pt{
 return {x:rescuer.p.x-23*Math.cos(rescuer.heading),
   y:rescuer.p.y-23*Math.sin(rescuer.heading)};
}
