/** EQA3.7: shared read-only eligibility for the tactical civilian palette
 * and the command dispatcher. Authoritative GO-time orders still recheck
 * physical reach; this does not mutate civilian state or reveal hidden actors.
 */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';

import {PERSON_CONTACT_REACH} from './breach-person-contact-standpoint.ts';
export const CIVILIAN_VOICE_RANGE=150;

/** Select a *reachable* civilian of the correct kind. The old
 * dispatcher chose the nearest civilian of ANY kind, even when the UI
 * offered FOLLOW because a farther rescue person was actually eligible.
 * SECURE/RESTRAIN use physical hand reach; spoken FOLLOW/STOP use
 * 150-unit unobstructed communication reach. Stable ties keep actor order.
 */
export function nearestContextCivilian<T extends Pick<CivilianActor,
 'p'|'health'|'state'|'rescueTarget'|'restrained'> &
 Partial<Pick<CivilianActor,'following'>>>(
  civilians:readonly T[],from:Pt,action:'secure'|'follow'|'restrain'|'stop-following',missionStage:string,
  disclosed:(p:Pt)=>boolean,
  physicalContact:(from:Pt,to:Pt)=>boolean
):T|null{
  const spoken=action==='follow'||action==='stop-following';
  if(spoken&&missionStage!=='extract')return null;
  let nearest:T|null=null,best=spoken?CIVILIAN_VOICE_RANGE:PERSON_CONTACT_REACH;
  for(const person of civilians){
    if(person.health<=0||
      (action==='stop-following'?!person.rescueTarget||
         !person.following||person.state!=='escorted':
       action==='follow'?!person.rescueTarget:
       action==='restrain'?person.state!=='compliant'||
         person.restrained===true||person.rescueTarget:
       person.state==='compliant'))
      continue;
    const distance=Math.hypot(from.x-person.p.x,from.y-person.p.y);
    // A currently escorted person is already known even outside the
    // present sight cone; a NEW FOLLOW requires disclosure. All spoken
    // commands still need an unobstructed route for the actual voice.
    const knownEscort=!!person.following&&person.state==='escorted';
    if(distance>=best||
       (distance>28&&action!=='stop-following'&&
        !(action==='follow'&&knownEscort)&&!disclosed(person.p))||
       !physicalContact(from,person.p))continue;
    nearest=person;best=distance;
  }
  return nearest;
}
