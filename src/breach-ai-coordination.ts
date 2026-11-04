/** Local team roles from reports each listener genuinely received.
 * Keep prior assignments stable as additional allies hear the message;
 * never use unseen player coordinates or global faction knowledge.
 */
import type {Pt} from './breach-core.ts';
export type GroupRole='investigate'|'watch'|'support';
type Listener={id:string;p:Pt};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function groupResponse(heard:readonly Listener[],
 estimatedThreat:Pt,committed:Readonly<Record<string,GroupRole>>={}
):Record<string,GroupRole>{
 const sorted=[...heard].sort((a,b)=>
  distance(a.p,estimatedThreat)-distance(b.p,estimatedThreat)||
  a.id.localeCompare(b.id));
 const roles:Record<string,GroupRole>={};
 // Retain assignment when a new listener joins; recomputing the nearest
 // investigator every tick can send a whole group into oscillating orders.
 for(const actor of sorted){
  const previous=committed[actor.id];
  if(previous)roles[actor.id]=previous;
 }
 for(const actor of sorted){
  if(roles[actor.id])continue;
  if(!Object.values(roles).includes('investigate'))
   roles[actor.id]='investigate';
  else if(!Object.values(roles).includes('watch'))
   roles[actor.id]='watch';
  else if(!Object.values(roles).includes('support'))
   roles[actor.id]='support';
  else roles[actor.id]='watch';
 }
 return roles;
}
