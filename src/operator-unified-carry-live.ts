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
import {nativeEquippedMagazine} from './operator-attachment-reference.ts';
import {seatMagazineInPouch,registeredMagazinePouches} from './operator-magazine-pouch-fit.ts';
import {sampleEquipmentGesture} from './breach-equipment-interaction-pose.ts';
import {v4AuthoredPouchAnchor} from './breach-reload-v4-magazine-handoff.ts';
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
 current.accent.dispose();cache.delete(r);
}
function suppressLegacy(r:OperatorRig){
 for(const o of [...r.rigPouches,r.beltPouch,r.medicalPouch,r.radioUnit,r.utilityTool,
  ...r.flashCanisters,...r.wedgeMeshes,...r.cuffMeshes,...r.visualKit.magazines.rig,
  ...r.visualKit.magazines.belt,...r.visualKit.magazines.pocket,
  ...Object.values(r.visualKit.accessories.beltLeft),...Object.values(r.visualKit.accessories.beltRight)])o.visible=false;
 for(const child of r.hip.children)if(child.name.startsWith('issued-belt-grenade-pouch-'))child.visible=false;
}
function concealedProp(r:OperatorRig,p:Placement,parent:THREE.Group,primaryPart:string|undefined){
 const root=new THREE.Group();parent.add(root);
 if(p.kind==='flash'){
  const m=r.flashCanister.clone(true);
  m.position.set(0,0,0);m.rotation.set(0,0,0);m.visible=true;
  m.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry=o.geometry.clone();});
  root.add(m);
 }else if(p.kind==='wedge'){
  const m=new THREE.Mesh(new THREE.BoxGeometry(3.9,1.45,1.5),r.gearMaterial);root.add(m);
 }else if(p.kind==='secondary-mag'){
  const m=new THREE.Mesh(new THREE.BoxGeometry(1.35,2.5,1.2),r.weaponDark);root.add(m);
 }else if(p.kind==='primary-mag'&&primaryPart){
  const geo=nativeEquippedMagazine(primaryPart);if(geo)root.add(new THREE.Mesh(geo,r.visualKit.carriedMagazineMaterial));
 }
 return root;
}
function createHolder(r:OperatorRig,p:Placement,storage:readonly StorageSlot[],rigOwner:THREE.Group|undefined,primaryPart:string|undefined,palette:AttachmentPalette):Holder|null{
 const socket=p.waist?.socket??p.mount;
 if(socket&&p.holder){
  const v=createAttachmentVisual(p.holder,palette,p.variant,true,{primaryPart,grenade:r.flashCanister,omitSidearm:true});
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
 const lanes=(p.contentIds??p.itemIds).map(()=>lane(concealedProp(r,p,root,primaryPart),false));
 return {root,lanes,concealed:true};
}
/** Call after legacy appearance on the real rig, before pose constraints.
 * Legacy objects are suppressed for staged actors only. No per-frame
 * geometry construction, no changes to the inventory or simulation. */
export function syncLiveUnifiedCarry(r:OperatorRig,p:Pick<OperatorPose,'unifiedCarry'|'weaponConfiguration'>,rigStyle:string){
 const state=p.unifiedCarry;
 if(!state){clearLiveUnifiedCarry(r);return;}
 const part=p.weaponConfiguration?.build?.parts.magazine;
 const waist=r.visualKit.wardrobeGear.waistRig[rigStyle];
 const chest=r.visualKit.wardrobeGear.rig[rigStyle];
 const owner=registeredMagazinePouches(waist).length?waist:chest;
 const key=rigStyle+'|'+(part??'');
 let current=cache.get(r);
 if(current?.held){restore(current.held);current.held=null;}
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
   h=createHolder(r,p,state.input.storage,owner,part,palette)??undefined;
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
 }
 current.manifest=state.manifest;
 suppressLegacy(r);
 for(const m of Object.values(palette))syncGearMarkedMaterials(m);
 r.root.userData.bt4Unrendered=[...current.unrendered];
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
  secondary&&progress>=.66&&progress<.72?secondary.selectedId:null;
 const l=id?current.items.get(id):undefined;
 if(!l)return;
 r.arms[0].hand.add(l.node);l.node.position.set(field?.item==='flashbang'?.35:0,field?.item==='flashbang'?-3.8:-3,0);
 l.node.rotation.set(0,0,field?.item==='flashbang'?Math.PI*.30:.15);
 l.node.visible=true;current.held=l;
}
