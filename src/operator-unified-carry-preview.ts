/** BT4 preview adapter. Builds only the proposed manifest's physical
 * holders; existing closed storage remains invisible. No gameplay mutation,
 * no alternative item placement, no per-frame mesh allocation. */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {PlacementManifest} from './equipment-unified-placement.ts';
import type {StorageSlot} from './equipment-fixed-carrier-slots.ts';
import {createAttachmentVisual,placeAttachmentVisual,type AttachmentSamples,type AttachmentPalette} from './operator-attachment-visuals.ts';
import {nativeEquippedMagazine} from './operator-attachment-reference.ts';
import {seatMagazineInPouch} from './operator-magazine-pouch-fit.ts';
type Preview={roots:THREE.Group[];accent:THREE.MeshStandardMaterial;key:string;unrendered:string[]};
const previews=new WeakMap<OperatorRig,Preview>();
export function clearUnifiedCarryPreview(rig:OperatorRig){
 const p=previews.get(rig);if(!p)return;
 for(const g of p.roots){g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});g.removeFromParent();}
 p.accent.dispose();previews.delete(rig);
}
export function showUnifiedCarryPreview(rig:OperatorRig,key:string,manifest:PlacementManifest,
 storage:readonly StorageSlot[],rigOwner:THREE.Group|undefined,samples:AttachmentSamples){
 let cached=previews.get(rig);if(cached?.key===key){for(const g of cached.roots)g.visible=true;return cached.unrendered;}
 clearUnifiedCarryPreview(rig);
 const accent=new THREE.MeshStandardMaterial({color:0xb76442,roughness:.9});
 const palette:AttachmentPalette={fabric:rig.gearMaterial,dark:rig.weaponDark,hardware:rig.weaponSteel,contents:rig.bootMaterial,accent};
 const roots:THREE.Group[]=[],groups=new Map<THREE.Object3D,THREE.Group>();
 const group=(parent:THREE.Object3D)=>{
  let g=groups.get(parent);if(!g){g=new THREE.Group();g.name='bt4-unified-carry-audition';parent.add(g);groups.set(parent,g);roots.push(g);}
  return g;
 };
 const unrendered:string[]=[];
 for(const p of manifest.placements){
  if(p.concealed)continue;
  const socket=p.waist?.socket??p.mount;
  if(socket&&p.holder){
   const v=createAttachmentVisual(p.holder,palette,p.variant,true,samples);
   placeAttachmentVisual(v,socket);
   v.root.userData.bt4SlotIds=[...p.slotIds];
   v.root.userData.bt4ContentIds=[...p.contentIds??p.itemIds];
   const contents=p.contentIds??p.itemIds;
   for(let i=0;i<v.contents.length;i++)v.contents[i].visible=!!contents[i]&&!contents[i]!.startsWith('cosmetic:');
   group(p.carrier==='belt'?rig.hip:rig.chest).add(v.root);
  }else if(rigOwner&&p.carrier==='rig'){
   const slot=storage.find(s=>p.slotIds.includes(s.id));
   const part=samples.primaryPart;
   if(!slot?.cell||!part){unrendered.push(...p.itemIds);continue;}
   const geo=nativeEquippedMagazine(part);if(!geo){unrendered.push(...p.itemIds);continue;}
   geo.rotateY(Math.PI/2);geo.computeBoundingBox();
   const seated=seatMagazineInPouch(geo.boundingBox!,slot.cell);
   if(!seated){geo.dispose();unrendered.push(...p.itemIds);continue;}
   const mesh=new THREE.Mesh(geo,rig.visualKit.carriedMagazineMaterial);
   mesh.position.set(seated.x,seated.y,seated.z);mesh.rotation.y=seated.yaw;
   mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.bt4SlotIds=[...p.slotIds];
   group(rigOwner).add(mesh);
  }else unrendered.push(...p.itemIds);
 }
 cached={roots,accent,key,unrendered};previews.set(rig,cached);return unrendered;
}
/** The Lab renderer temporarily masks legacy props, then restores their
 * exact previous visibility immediately after rendering. The cached normal
 * appearance and animation authority is not altered. */
export function maskLegacyCarryForPreview(rig:OperatorRig){
 const targets=new Set<THREE.Object3D>([
  ...rig.rigPouches,rig.beltPouch,rig.medicalPouch,rig.radioUnit,rig.utilityTool,
  ...rig.flashCanisters,...rig.wedgeMeshes,...rig.cuffMeshes,
  ...rig.visualKit.magazines.rig,...rig.visualKit.magazines.belt,...rig.visualKit.magazines.pocket,
  ...Object.values(rig.visualKit.accessories.beltLeft),...Object.values(rig.visualKit.accessories.beltRight)
 ]);
 for(const parent of [rig.hip,rig.chest,rig.pack])for(const child of parent.children)
  if(child.name.startsWith('issued-belt-grenade-pouch-')||child.name==='secondary-rig-carry'||child.name==='secondary-pack-carry'||child.name==='secondary-carry')targets.add(child);
 // The existing holster root name varies; mask its parent rather than
 // deleting the actual sidearm model or transferring its mesh ownership.
 rig.hip.traverse(o=>{if(o.name==='secondary-holster-shell'||o.name.startsWith('secondary-magazine-pouch-')||o.userData.secondaryWeaponVisual===true)targets.add(o);});
 const states=[...targets].map(o=>[o,o.visible] as const);
 for(const [o] of states)o.visible=false;
 return ()=>{for(const [o,v] of states)o.visible=v;};
}
export function hideUnifiedCarryPreview(rig:OperatorRig){for(const g of previews.get(rig)?.roots??[])g.visible=false;}
