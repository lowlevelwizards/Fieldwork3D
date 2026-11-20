/** Real neutral rescue identity and physical handoff rules.
 * No teleport, global rescue permission, or duplicated puppet figure. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import {physicalFollowGoal,physicalFollowerSeparated,
 physicalEscortWalkMultiplier} from './breach-follow-physical-policy.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function canSecureRescuePerson(
 person:CivilianActor,rescuer:{p:Pt;health:number},
 clear:(a:Pt,b:Pt)=>boolean):boolean{
 return person.rescueTarget&&person.health>0&&rescuer.health>0&&
   dist(person.p,rescuer.p)<=28&&clear(person.p,rescuer.p);
}
export function rescueEscortSeparated(person:CivilianActor,
 rescuer:{p:Pt;health:number}|null):boolean{
 return physicalFollowerSeparated(person,rescuer);
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
 return physicalEscortWalkMultiplier(rescuer,person);
}
/** EQA3.8: an actively escorted civilian should not be trapped by
 * stationary friendly squadmates near insertion/extraction. The shared
 * movement arbiter already makes blue↔neutral traffic soft. This mirrors
 * that policy only for genuine FOLLOW, preserving ordinary civilians'
 * cautious crowd avoidance and every hostile/neutral/wall/door collision.
 */
export function escortUsesFriendlySoftTraffic(
 person:Pick<CivilianActor,'state'|'following'|'health'>
):boolean{
 return person.health>0&&person.state==='escorted'&&!!person.following;
}

export function rescueFollowGoal(
 rescuer:{p:Pt;heading:number;priorP?:Pt;velocity?:number},
 follower?:Pick<CivilianActor,'p'>|null
):Pt{
 // EQA3.1: a tactical actor can WATCH a hostile while traversing sideways.
 // The civilian should follow their ACTUAL travelled corridor, not a point
 // behind the barrel. Otherwise a long sideways MOVE zigzags the civilian
 // into fixtures while the leader pulls farther away. An idle escort has
 // no observed movement: retain the original stable facing-based fallback.
 return physicalFollowGoal(rescuer,follower);
}
