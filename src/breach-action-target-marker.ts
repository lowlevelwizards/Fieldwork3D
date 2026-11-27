import {coveringContactPoint} from './breach-window-covering-interaction.ts';
import {normalizeWindowCovering} from './breach-window-coverings.ts';
/** A single read-only selection marker for the actual authored target.
 * Selection belongs to a stable actor/prop ID, never to an approximate tap
 * that could silently switch to someone else after the plan is queued.
 */
import {doorCenter,type Pt} from './breach-core.ts';
import {liveVisibility,type Session,type TeamActor} from './breach-game.ts';
import {coverTargetIndex} from './worldgen/site-object-identity.ts';
import {windowBashPoint} from './breach-window-bash.ts';
import {presentCivilian}
 from './rendering/breach-3d-disclosure-presenter.ts';
export type ActionTargetMarker={p:Pt;kind:'person'|'prop'|'door'|'weapon'};
export function selectedActionTarget(s:Session,a:TeamActor,
 selectedNode:number|null):ActionTargetMarker|null{
 // The selected waypoint is authoritative. A selected MOVE must not
 // display the unrelated dot of an older interaction later in the queue.
 // No per-frame reversed-plan allocation; tactical overlays run every RAF.
 const targetable=(n:TeamActor['plan'][number])=>
   n.kind==='interact'||n.kind==='treat'||n.kind==='evacuate'||
   n.kind==='door';
 let node:TeamActor['plan'][number]|undefined;
 if(selectedNode!==null){
   const chosen=a.plan.find(n=>n.id===selectedNode);
   node=chosen&&targetable(chosen)?chosen:undefined;
 }else for(let i=a.plan.length-1;i>=0;i--){
   if(targetable(a.plan[i])){node=a.plan[i];break;}
 }
 if(!node)return null;
 if(node.kind==='door'&&node.doorId){
  const door=s.doors.find(d=>d.id===node.doorId);
  return door?{p:doorCenter(door),kind:'door'}:null;
 }
 const patient=node.kind==='treat'||node.kind==='evacuate'?
   node.patientId:null;
 const id=patient??node.objectId??'';
 if(id.startsWith('covering:')){
  const w=s.windows.find(w=>w.id===id.slice(9)),c=w?normalizeWindowCovering(w):undefined;
  if(!w||!c||!liveVisibility(s,{x:w.x,y:w.y}))return null;
  return {p:coveringContactPoint(w,c,node.p,a.posture==='crouch').p,kind:'prop'};
 }
 if(id.startsWith('window:')){
  const window=s.windows.find(w=>w.id===id.slice(7));
  if(!window)return null;
  const p=windowBashPoint(window,node.p);
  return liveVisibility(s,p)?{p,kind:'prop'}:null;
 }
 if(id.startsWith('prop:')){
  const index=coverTargetIndex(s.coverState,id.slice(5));
  const prop=s.coverState[index];
  return prop&&s.intel.cover.has(index)?
    {p:{x:prop.x,y:prop.y},kind:'prop'}:null;
 }
 if(id.startsWith('weapon:')){
  const weapon=s.droppedFirearms.find(w=>String(w.id)===id.slice(7));
  return weapon?.status==='loose'&&liveVisibility(s,weapon.p)?
    {p:weapon.p,kind:'weapon'}:null;
 }
 const subjectId=id.startsWith('suspect:')?id.slice(8):id;
 const person=s.civilians.find(c=>c.id===subjectId);
 if(person&&presentCivilian(s,person,false,null))
  return {p:person.p,kind:'person'};
 const suspect=s.operators.find(e=>e.id===subjectId);
 if(suspect&&(suspect.side==='blue'||liveVisibility(s,suspect.p)))
  return {p:suspect.p,kind:'person'};
 return null;
}
