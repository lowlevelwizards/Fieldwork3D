/** Local team roles from reports each listener genuinely received.
 * Keep prior assignments stable as additional allies hear the message;
 * never use unseen player coordinates or global faction knowledge.
 */
import type {AiGroupKind} from './breach-ai-group-profiles.ts';
import type {Pt} from './breach-core.ts';
import type {OperationKind} from './breach-operations.ts';
import type {EncounterRole} from './worldgen/encounter-types.ts';
export type GroupRole='investigate'|'watch'|'support';
type Listener={id:string;p:Pt};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function groupResponse(heard:readonly Listener[],
 estimatedThreat:Pt,committed:Readonly<Record<string,GroupRole>>={},
 groupKind?:AiGroupKind
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
 // Loose groups may share a warning but do not necessarily adopt a
 // formal supporting duty. Existing commitments are never reassigned.
 const loose=groupKind==='opportunists'||groupKind==='fugitives';
 const occupied=new Set(Object.values(roles));
 for(const actor of sorted){
  if(roles[actor.id])continue;
  const role:GroupRole=!occupied.has('investigate')?'investigate':
    !occupied.has('watch')||loose?'watch':!occupied.has('support')?'support':'watch';
  roles[actor.id]=role;occupied.add(role);
 }
 return roles;
}

/** One evidence-grounded group assignment may preserve an assigned guard.
 * Only the ACTUAL recipients and an explicitly assigned mission post count.
 * Existing role commitments survive later report delivery, and there is
 * always a real listener available to investigate before reassignment.
 */
export function missionGroupResponse(
 heard:readonly (Listener&{role?:EncounterRole})[],estimatedThreat:Pt,
 committed:Readonly<Record<string,GroupRole>>,mission:OperationKind,
 objective:Pt,groupKind?:AiGroupKind):Record<string,GroupRole>{
 const roles=groupResponse(heard,estimatedThreat,committed,groupKind);
 if(mission==='clear'||heard.length<2)return roles;
 const ordered=heard.filter(a=>
   (a.role==='sentry'||a.role==='reserve'||a.role==='leader')&&
   distance(a.p,objective)<=145&&!committed[a.id])
   .sort((a,b)=>distance(a.p,objective)-distance(b.p,objective)||
     a.id.localeCompare(b.id));
 const post=ordered.find(a=>roles[a.id]==='investigate');
 if(!post)return roles;
 const investigator=heard.filter(a=>a.id!==post.id&&
   roles[a.id]!=='investigate'&&!committed[a.id])
   .sort((a,b)=>distance(a.p,estimatedThreat)-distance(b.p,estimatedThreat)||
     a.id.localeCompare(b.id))[0];
 if(!investigator)return roles;
 roles[post.id]='watch';
 roles[investigator.id]='investigate';
 return roles;
}
