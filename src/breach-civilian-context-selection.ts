/** EQA3.7: shared read-only eligibility for the tactical civilian palette
 * and the command dispatcher. Authoritative GO-time orders still recheck
 * physical reach; this does not mutate civilian state or reveal hidden actors.
 */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';

/** Select a *reachable* known civilian of the correct kind. The old
 * dispatcher chose the nearest civilian of ANY kind, even when the UI
 * offered FOLLOW because a farther rescue person was actually eligible.
 * Keep 34-unit planning reach and stable ordering of tied candidates.
 */
export function nearestContextCivilian<T extends Pick<CivilianActor,
 'p'|'health'|'state'|'rescueTarget'>>(
  civilians:readonly T[],from:Pt,action:'secure'|'follow',missionStage:string,
  disclosed:(p:Pt)=>boolean,
  physicalContact:(from:Pt,to:Pt)=>boolean
):T|null{
  if(action==='follow'&&missionStage!=='extract')return null;
  let nearest:T|null=null,best=34;
  for(const person of civilians){
    if(person.health<=0||
      (action==='follow'?!person.rescueTarget:person.state==='compliant'))
      continue;
    const distance=Math.hypot(from.x-person.p.x,from.y-person.p.y);
    if(distance>=best||!disclosed(person.p)||
       !physicalContact(from,person.p))continue;
    nearest=person;best=distance;
  }
  return nearest;
}
