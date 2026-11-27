/** BT3P6: presentation-only issued flash holders. Existing canister meshes
 * remain on the hip (or support hand); no extra inventory or throw logic.
 * Reserve legacy hip equipment conservatively until BT4 unifies placement. */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {BeltStyle} from './operator-belt-profile.ts';
import {attachmentMountRequest} from './operator-attachment-catalog.ts';
import {resolveBeltMounts,type BeltMountRequest,type BeltRegion} from './operator-belt-mounts.ts';
import {createAttachmentVisual,placeAttachmentVisual,type AttachmentVisual} from './operator-attachment-visuals.ts';
const holders=new WeakMap<OperatorRig,AttachmentVisual[]>();
export function planBeltFlashPouches(style:BeltStyle,indices:readonly number[],blocked:readonly BeltRegion[]=[]){
 const reserved:BeltMountRequest[]=blocked.map((region,i)=>({id:'legacy-'+i,preferred:region,allowed:[region],
  footprint:{width:region==='left-hip'||region==='right-hip'?5.5:3.1,height:3,depth:2,spaces:0}}));
 const requests=indices.flatMap(i=>{
  const request=attachmentMountRequest('flash-'+i,'grenade-pouch',style,'standard',
    (['front-left','front-right','rear-left','rear-right'] as const)[i%4]);
  return request?[request]:[];
 });
 return resolveBeltMounts(style,[...reserved,...requests]).mounts.filter(m=>m.id.startsWith('flash-'));
}
export function prepareBeltFlashPouches(r:OperatorRig,style:BeltStyle,indices:readonly number[],blocked:readonly BeltRegion[]){
 const existing=holders.get(r)??[];
 existing.forEach(v=>{if(v)v.root.visible=false;});
 for(const m of r.flashCanisters)delete m.userData.fieldworkBeltFlashRest;
 const mounts=planBeltFlashPouches(style,indices,blocked);
 const fitted=new Set<number>();
 for(const mount of mounts){
  const i=Number(mount.id.slice(6)),mesh=r.flashCanisters[i];if(!mesh)continue;
  let visual=existing[i];
  if(!visual){
   visual=createAttachmentVisual('grenade-pouch',{fabric:r.gearMaterial,dark:r.weaponDark,
    hardware:r.weaponSteel,contents:r.weaponSteel,accent:r.weaponDark});
   visual.root.name='issued-belt-grenade-pouch-'+i;r.hip.add(visual.root);existing[i]=visual;
  }
  placeAttachmentVisual(visual,mount.socket);visual.root.visible=true;
  visual.root.updateMatrix();
  const rest=visual.contentSockets[0].position.clone().applyMatrix4(visual.root.matrix);
  mesh.userData.fieldworkBeltFlashRest=rest.toArray();
  fitted.add(i);
 }
 if(existing.length)holders.set(r,existing);
 return fitted;
}
export function restoreBeltFlashRest(r:OperatorRig,mesh:THREE.Mesh){
 const rest=mesh.userData.fieldworkBeltFlashRest;
 if(!Array.isArray(rest)||rest.length!==3)return false;
 if(mesh.parent!==r.hip)r.hip.add(mesh);
 mesh.position.set(rest[0],rest[1],rest[2]);mesh.rotation.set(0,0,0);return true;
}
