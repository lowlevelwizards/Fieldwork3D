import {OBB} from 'three/addons/math/OBB.js';
/** BT4.8 staged manifest renderer. Physical holder identities are slot IDs,
 * not contents. Reconcile only when the immutable mission manifest changes.
 * The same exposed content node moves into the support hand and returns to
 * its own socket. Concealed stock is never drawn as a loose exterior prop. */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {UnifiedDeployedCarry} from './equipment-unified-deployed.ts';
import type {Placement} from './equipment-unified-placement.ts';
import type {StorageSlot} from './equipment-fixed-carrier-slots.ts';
import {createAttachmentVisual,placeAttachmentVisual,type AttachmentPalette} from './operator-attachment-visuals.ts';
import {nativeEquippedMagazine,nativeSecondaryMagazine} from './operator-attachment-reference.ts';
import {seatMagazineInPouch,registeredMagazinePouches} from './operator-magazine-pouch-fit.ts';
import {sampleEquipmentGesture} from './breach-equipment-interaction-pose.ts';
import {v4AuthoredPouchAnchor} from './breach-reload-v4-magazine-handoff.ts';
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import {syncGearMarkedMaterials} from './operator-gear-pixel-art.ts';
type Lane={node:THREE.Object3D;parent:THREE.Object3D;position:THREE.Vector3;rotation:THREE.Quaternion;id:string|null;visible:boolean};
type Holder={root:THREE.Group;lanes:Lane[];concealed:boolean};
type Live={manifest:UnifiedDeployedCarry['manifest'];key:string;holders:Map<string,Holder>;items:Map<string,Lane>;unrendered:string[];accent:THREE.MeshStandardMaterial;held:Lane|null};
const cache=new WeakMap<OperatorRig,Live>();
const keyOf=(p:Placement)=>p.slotIds.join('|');
function lane(node:THREE.Object3D,visible:boolean):Lane{
 return {node,parent:node.parent!,position:node.position.clone(),rotation:node.quaternion.clone(),id:null,visible};
}
function restore(l:Lane){if(l.node.parent!==l.parent)l.parent.add(l.node);l.node.position.copy(l.position);l.node.quaternion.copy(l.rotation);l.node.visible=l.visible&&!!l.id&&!l.id.startsWith('cosmetic:');}
function destroy(h:Holder){
 for(const l of h.lanes)restore(l);
 const geometries=new Set<THREE.BufferGeometry>();
 h.root.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});
 for(const g of geometries)g.dispose();h.root.removeFromParent();
}
export function clearLiveUnifiedCarry(r:OperatorRig){
 const current=cache.get(r);if(!current)return;
 for(const h of current.holders.values())destroy(h);
 current.accent.dispose();cache.delete(r);delete r.root.userData.bt4Unrendered;
}
function suppressLegacy(r:OperatorRig){
 for(const o of [...r.rigPouches,r.beltPouch,r.medicalPouch,r.radioUnit,r.utilityTool,
  ...r.flashCanisters,...r.wedgeMeshes,...r.cuffMeshes,...r.visualKit.magazines.rig,
  ...r.visualKit.magazines.belt,...r.visualKit.magazines.pocket,
  ...Object.values(r.visualKit.accessories.beltLeft),...Object.values(r.visualKit.accessories.beltRight)])o.visible=false;
 for(const child of r.hip.children)if(child.name.startsWith('issued-belt-grenade-pouch-'))child.visible=false;
}
function concealedProp(r:OperatorRig,p:Placement,parent:THREE.Group,primaryPart:string|undefined,secondaryWeapon:GlockAppearanceId|undefined){
 const root=new THREE.Group();parent.add(root);
 if(p.kind==='flash'){
  const m=r.flashCanister.clone(true);
  m.position.set(0,0,0);m.rotation.set(0,0,0);m.visible=true;
  m.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry=o.geometry.clone();});
  root.add(m);
 }else if(p.kind==='wedge'){
  const m=new THREE.Mesh(new THREE.BoxGeometry(3.9,1.45,1.5),r.gearMaterial);root.add(m);
 }else if(p.kind==='secondary-mag'){
  if(secondaryWeapon)root.add(nativeSecondaryMagazine(secondaryWeapon,r.weaponDark,r.weaponSteel));
  else root.add(new THREE.Mesh(new THREE.BoxGeometry(1.35,2.5,1.2),r.weaponDark));
 }else if(p.kind==='primary-mag'&&primaryPart){
  const geo=nativeEquippedMagazine(primaryPart);if(geo)root.add(new THREE.Mesh(geo,r.visualKit.carriedMagazineMaterial));
 }
 return root;
}
function createHolder(r:OperatorRig,p:Placement,storage:readonly StorageSlot[],rigOwner:THREE.Group|undefined,primaryPart:string|undefined,secondaryWeapon:GlockAppearanceId|undefined,palette:AttachmentPalette):Holder|null{
 const socket=p.waist?.socket??p.mount;
 if(socket&&p.holder){
  const v=createAttachmentVisual(p.holder,palette,p.variant,true,{primaryPart,secondaryWeapon,grenade:r.flashCanister,omitSidearm:true});
  placeAttachmentVisual(v,socket);
  v.root.name='bt4-live-'+p.holder;v.root.userData.bt4SlotIds=[...p.slotIds];
  (p.carrier==='belt'?r.hip:r.chest).add(v.root);
  return {root:v.root,lanes:v.contents.map(o=>lane(o,true)),concealed:false};
 }
 const root=new THREE.Group();root.name='bt4-live-cell';root.userData.bt4SlotIds=[...p.slotIds];
 const slot=storage.find(s=>p.slotIds.includes(s.id));
 if(!p.concealed&&p.carrier==='rig'&&rigOwner&&slot?.cell&&primaryPart){
  const geo=nativeEquippedMagazine(primaryPart);
  if(!geo)return null;
  geo.rotateY(Math.PI/2);geo.computeBoundingBox();
  const seated=seatMagazineInPouch(geo.boundingBox!,slot.cell);
  if(!seated){geo.dispose();return null;}
  rigOwner.add(root);
  const mesh=new THREE.Mesh(geo,r.visualKit.carriedMagazineMaterial);
  mesh.position.set(seated.x,seated.y,seated.z);mesh.rotation.y=seated.yaw;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  return {root,lanes:[lane(mesh,true)],concealed:false};
 }
 if(!p.concealed)return null;
 // Concealed items have an explicit hidden source for handoff only.
 const parent=p.carrier==='backpack'?r.pack:p.carrier==='pocket'?r.hip:rigOwner??r.chest;
 parent.add(root);
 if(slot?.cell)root.position.set(slot.cell.x,slot.cell.y,slot.cell.z);
 else if(p.carrier==='backpack')root.position.set(0,-2,0);
 else if(p.carrier==='pocket')root.position.set(-.5,-4,6);
 const lanes=(p.contentIds??p.itemIds).map(()=>lane(concealedProp(r,p,root,primaryPart,secondaryWeapon),false));
 return {root,lanes,concealed:true};
}
/** Call after legacy appearance on the real rig, before pose constraints.
 * Legacy objects are suppressed for staged actors only. No per-frame
 * geometry construction, no changes to the inventory or simulation. */
export function syncLiveUnifiedCarry(r:OperatorRig,p:Pick<OperatorPose,'unifiedCarry'|'weaponConfiguration'|'equipment'>,rigStyle:string,appearanceChanged=false){
 const state=p.unifiedCarry;
 if(!state){clearLiveUnifiedCarry(r);return;}
 const primary=p.equipment?.slots.primary;
 const part=p.weaponConfiguration?.build?.parts.magazine??(primary==='primary-rifle'?'fal-mag20':primary==='primary-smg'?'hk9-mag30':primary==='primary-shotgun'?undefined:'ar-mag30');
 const secondaryWeapon=p.equipment?.secondary?.weapon??undefined;
 const waist=r.visualKit.wardrobeGear.waistRig[rigStyle];
 const chest=r.visualKit.wardrobeGear.rig[rigStyle];
 const owner=registeredMagazinePouches(waist).length?waist:chest;
 const key=rigStyle+'|'+(part??'')+'|'+(secondaryWeapon??'');
 let current=cache.get(r);
 if(current?.held){restore(current.held);current.held=null;}
 if(current?.key===key&&current.manifest===state.manifest){
  if(appearanceChanged){suppressLegacy(r);syncGearMarkedMaterials(r.gearMaterial);syncGearMarkedMaterials(r.visualKit.wardrobeGear.beltMaterial);syncGearMarkedMaterials(r.weaponDark);syncGearMarkedMaterials(r.weaponSteel);syncGearMarkedMaterials(r.visualKit.carriedMagazineMaterial);}
  return;
 }
 if(!current||current.key!==key){
  clearLiveUnifiedCarry(r);
  current={manifest:state.manifest,key,holders:new Map(),items:new Map(),unrendered:[],accent:new THREE.MeshStandardMaterial({color:0xb76442,roughness:.9}),held:null};
  cache.set(r,current);
 }
 const palette:AttachmentPalette={fabric:r.gearMaterial,dark:r.weaponDark,hardware:r.weaponSteel,contents:r.visualKit.carriedMagazineMaterial,accent:current.accent};
 const ids=new Set(state.manifest.placements.map(keyOf));
 for(const [id,h] of current.holders)if(!ids.has(id)){destroy(h);current.holders.delete(id);}
 current.items.clear();current.unrendered=[];
 for(const p of state.manifest.placements){
  const id=keyOf(p);
  // Replay can replace the same slot with a different holder/outfit.
  const signature=JSON.stringify([p.holder,p.variant,p.kind,p.waist?.socket,p.mount,p.concealed]);
  let h=current.holders.get(id);
  if(h&&h.root.userData.bt4Signature!==signature){destroy(h);current.holders.delete(id);h=undefined;}
  if(!h){
   h=createHolder(r,p,state.input.storage,owner,part,secondaryWeapon,p.carrier==='belt'?{...palette,fabric:r.visualKit.wardrobeGear.beltMaterial}:palette)??undefined;
   if(!h){current.unrendered.push(...p.itemIds);continue;}
   h.root.userData.bt4Signature=signature;current.holders.set(id,h);
  }
  const contents=p.contentIds??p.itemIds;
  h.root.userData.bt4ContentIds=[...contents];
  h.root.visible=true;
  for(let i=0;i<h.lanes.length;i++){
   const l=h.lanes[i];l.id=contents[i]??null;restore(l);
   if(l.id)current.items.set(l.id,l);
  }
  // Closed utility holders have no visible contents by design. A hidden
  // handoff node can still represent a retrievable owned magazine.
  if(p.holder==='utility-pouch'&&p.kind==='primary-mag'&&h.lanes.length===0){
   const l=lane(concealedProp(r,p,h.root,part,secondaryWeapon),false);
   l.position.set(0,-1,1);h.lanes.push(l);l.id=contents[0]??null;restore(l);
   if(l.id)current.items.set(l.id,l);
  }
  if(p.holder==='rigid-holster'&&p.kind!=='sidearm')for(const l of h.lanes)l.node.visible=false;
 }
 current.manifest=state.manifest;
 suppressLegacy(r);
 for(const m of Object.values(palette))syncGearMarkedMaterials(m);
 syncGearMarkedMaterials(r.visualKit.wardrobeGear.beltMaterial);
 r.root.userData.bt4Unrendered=[...current.unrendered];
}
export function liveUnifiedContentIsExposed(r:OperatorRig,id:string|null|undefined){
 const l=id?cache.get(r)?.items.get(id):undefined;return !!l?.visible;
}
export function liveUnifiedContent(r:OperatorRig,id:string|null|undefined){
 const l=id?cache.get(r)?.items.get(id):undefined;return l?.node;
}
export function liveUnifiedAnchor(r:OperatorRig,id:string|null|undefined){
 const l=id?cache.get(r)?.items.get(id):undefined;
 if(!l)return null;
 if(l.parent===r.pack||l.parent.parent===r.pack){
  const v=l.position.clone();l.parent.updateMatrix();v.applyMatrix4(l.parent.matrix);r.pack.updateMatrix();return v.applyMatrix4(r.pack.matrix);
 }
 return v4AuthoredPouchAnchor(l.node,r.chest,r.hip);
}
/** The existing fixed-step gesture supplies the exact serial. Use the same
 * cached node, not another copy, and restore its local socket on cancel. */
export function presentLiveUnifiedHandoff(r:OperatorRig,p:OperatorPose,allowed:boolean){
 const current=cache.get(r);if(!current)return;
 if(current.held){restore(current.held);current.held=null;}
 const field=allowed?p.equipmentInteraction:null;
 const secondary=!p.down&&!p.surrender?p.secondaryReload:null;
 const progress=secondary?secondary.elapsed/Math.max(.001,secondary.duration):0;
 const id=field&&sampleEquipmentGesture(field).inHand?field.contentId:
  secondary&&progress>=.26&&progress<.72?secondary.selectedId:null;
 const l=id?current.items.get(id):undefined;
 if(!l)return;
 if(!field&&secondary){
  // Same fixed-step lift window as the legacy sidearm reload. Concealed
  // stock appears only once the support hand has contacted the carrier.
  const t=Math.max(0,Math.min(1,(progress-.26)/.40)),ease=t*t*(3-2*t);
  if(!l.visible&&progress<.42)return;
  r.root.updateMatrixWorld(true);
  const from=l.node.getWorldPosition(new THREE.Vector3()),to=r.arms[0].hand.getWorldPosition(new THREE.Vector3());
  r.arms[0].hand.add(l.node);l.node.position.copy(r.arms[0].hand.worldToLocal(from.lerp(to,ease)));
  l.node.rotation.set(0,0,.15*ease);
 }else{
  r.arms[0].hand.add(l.node);l.node.position.set(field?.item==='flashbang'?.35:0,field?.item==='flashbang'?-3.8:-3,0);
  l.node.rotation.set(0,0,field?.item==='flashbang'?Math.PI*.30:.15);
 }
 l.node.visible=true;current.held=l;
}

/** Optional Lab-only broad-phase clearance audit after a committed pose.
 * Oriented holder boxes follow the actual animated parent transforms. A
 * positive result is a potential collision, not a mesh penetration proof.
 * No work at all is done unless the author requests this diagnostic. */
export function auditLiveUnifiedClearance(r:OperatorRig){
 const current=cache.get(r);if(!current)return [];
 r.root.updateMatrixWorld(true);
 const volumes:{id:string;box:OBB}[]=[];
 const obstacles:{id:string;box:OBB}[]=[];
 const worldBox=(box:THREE.Box3,matrix:THREE.Matrix4)=>{
  const size=box.getSize(new THREE.Vector3()).multiplyScalar(.5);
  size.set(Math.max(.001,size.x-.04),Math.max(.001,size.y-.04),Math.max(.001,size.z-.04));
  // OBB.applyMatrix4 expects a center at the local origin. Transform the
  // off-center local midpoint explicitly; otherwise rotating the rig can
  // report contacts at the wrong waist location.
  const obb=new OBB(new THREE.Vector3(),size).applyMatrix4(matrix);
  obb.center.copy(box.getCenter(new THREE.Vector3()).applyMatrix4(matrix));return obb;
 };
 for(const [id,h] of current.holders){
  if(h.concealed||!h.root.visible||!h.root.name.startsWith('bt4-live-')||h.root.name==='bt4-live-cell')continue;
  const shell=h.root.children.find(o=>o.name==='holder');if(!shell)continue;
  const box=new THREE.Box3(),inverse=h.root.matrixWorld.clone().invert();
  shell.traverse(o=>{
   if(!(o instanceof THREE.Mesh)||!o.visible)return;
   o.geometry.computeBoundingBox();if(!o.geometry.boundingBox)return;
   const m=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld);
   box.union(o.geometry.boundingBox.clone().applyMatrix4(m));
  });
  if(box.isEmpty())continue;
  volumes.push({id,box:worldBox(box,h.root.matrixWorld)});
 }
 // Thigh meshes include their actual animated garment transforms. The
 // pack body uses authored root bounds, excluding its separate harness.
 for(let i=0;i<r.legs.length;i++){
  const mesh=r.legs[i].upper;mesh.geometry.computeBoundingBox();
  if(mesh.visible&&mesh.geometry.boundingBox)obstacles.push({id:'thigh:'+i,box:worldBox(mesh.geometry.boundingBox,mesh.matrixWorld)});
 }
 const pack=r.visualKit.packPreview.active?.root;
 if(pack?.visible){
  const inv=pack.matrixWorld.clone().invert(),local=new THREE.Box3();
  pack.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible){o.geometry.computeBoundingBox();if(o.geometry.boundingBox)local.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)));}});
  if(!local.isEmpty())obstacles.push({id:'pack-body',box:worldBox(local,pack.matrixWorld)});
 }
 const contacts:string[]=[];
 for(const v of volumes)for(const o of obstacles)if(v.box.intersectsOBB(o.box))contacts.push(v.id+' / '+o.id);
 for(let i=0;i<volumes.length;i++)for(let j=i+1;j<volumes.length;j++)
  if(volumes[i].box.intersectsOBB(volumes[j].box))contacts.push(volumes[i].id+' / '+volumes[j].id);
 return contacts;
}
