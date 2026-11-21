/** OC9: presentation-only candidate query for the existing DRAG/CARRY
 * transport order. No movement or custody authority lives here.
 */
import type {Session} from './breach-game.ts';
import type {Pt} from './breach-core.ts';

export type TransportCandidate={
 id:string;name:string;kind:'squad'|'civilian'|'capture';
};
type QueryState=Pick<Session,'operators'|'civilians'|'captureTarget'|
 'missionType'|'missingRecoveryTargetId'>;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

/** The player's own downed squad is known. Civilians and hostile target
 * identities require current field observation; no fog or wall bypass. */
export function nearestTransportCandidate(s:QueryState,
 selected:string,visible:(p:Pt)=>boolean):TransportCandidate|null{
 const operator=s.operators.find(a=>a.id===selected&&
   a.side==='blue'&&a.health>0);
 if(!operator)return null;
 const options:{p:Pt;value:TransportCandidate}[]=[];
 for(const friend of s.operators){
  if(friend.id===operator.id||friend.side!=='blue'||friend.health>0||
     friend.surrendered||
     (friend.carriedById&&friend.carriedById!==operator.id))continue;
  options.push({p:friend.p,value:{
    id:friend.id,name:friend.name,kind:'squad'}});
 }
 for(const person of s.civilians){
  if(person.health>0||!visible(person.p)||
     (person.carriedById&&person.carriedById!==operator.id))continue;
  const label=person.rescueTarget&&s.missingRecoveryTargetId?
    'MISSING OPERATOR':person.rescueTarget?'RESCUE PATIENT':'CIVILIAN CASUALTY';
  options.push({p:person.p,value:{
    id:person.id,name:label,kind:'civilian'}});
 }
 if(s.missionType==='capture'&&s.captureTarget){
  const captive=s.operators.find(a=>a.id===s.captureTarget&&
   a.side==='red'&&a.health<=0&&visible(a.p)&&
   (!a.carriedById||a.carriedById===operator.id));
  if(captive)options.push({p:captive.p,value:{
    id:captive.id,name:'CAPTURE TARGET',kind:'capture'}});
 }
 options.sort((a,b)=>dist(operator.p,a.p)-dist(operator.p,b.p)||
   a.value.id.localeCompare(b.value.id));
 return options[0]?.value??null;
}
