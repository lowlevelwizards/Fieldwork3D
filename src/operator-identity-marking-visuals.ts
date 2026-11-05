/** R5B: actual limb-mounted markings. Four static fitted surfaces per actor.
 * Materials/textures are swapped on selection, never rebuilt every pose.
 * No decal depth overrides, collisions, armor, or equipment authority.
 */
import * as THREE from 'three';
import {MARKING_SLOTS,type MarkingSlot,type IdentityMarkings,
 identityMarking} from './operator-identity-markings.ts';
import {markingBitmap} from './operator-identity-marking-art.ts';
import {armorAttachmentFrame} from './operator-armor-attachment-frame.ts';
import {outwardLimbPatch} from './operator-garment-mount-frame.ts';
const textures=new Map<string,THREE.DataTexture>();
function textureFor(id:string):THREE.DataTexture|null{
 const cached=textures.get(id);if(cached)return cached;
 const art=markingBitmap(id);if(!art)return null;
 const map=new THREE.DataTexture(art.pixels,art.width,art.height,THREE.RGBAFormat);
 map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestFilter;
 map.generateMipmaps=false;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
 map.colorSpace=THREE.SRGBColorSpace;map.flipY=true;map.needsUpdate=true;
 textures.set(id,map);return map;
}
export type IdentityVisuals={
 meshes:Record<MarkingSlot,THREE.Mesh>;
 materials:Record<MarkingSlot,THREE.MeshStandardMaterial>;
 selected:Record<MarkingSlot,string>;
};
export function createIdentityVisuals(chest:THREE.Group,
 arms:readonly {upper:THREE.Mesh}[]):IdentityVisuals{
 const meshes={} as Record<MarkingSlot,THREE.Mesh>;
 const materials={} as Record<MarkingSlot,THREE.MeshStandardMaterial>;
 const selected={} as Record<MarkingSlot,string>;
 for(const slot of MARKING_SLOTS){
  const isChest=slot==='chest',isBand=slot==='armband';
  const width=isChest?7.0:isBand?3.6:2.7,height=isChest?1.7:isBand?1.1:1.8;
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,
   metalness:0,flatShading:true,side:THREE.FrontSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
  mesh.name='R5-identification-'+slot;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.visible=false;
  if(isChest){
   chest.add(mesh);mesh.rotation.y=Math.PI/2;mesh.position.set(9.8,3.5,0);
  }else{
   const arm=arms[slot==='leftShoulder'||isBand?0:1];
   if(arm){
    arm.upper.add(mesh);
    // alignSegment scales the *upper-arm mesh* by ten along local Y.
    // Child decals must cancel that inherited scale or a 1.8-unit flag
    // becomes an 18-unit banner hanging below the shoulder.
    // The limb's anatomical exterior is local +X on BOTH arms, never +/-Z.
    const limbLength=10;
    const mount=outwardLimbPatch(2.16,isBand?-.18:.24,
     height,width,.14);
    mesh.position.set(mount.x+.08,mount.y,0);
    mesh.scale.y=1/limbLength;
    mesh.rotation.y=Math.PI/2;
    mesh.userData.mountSurface='upper-arm-outward-X';
    mesh.userData.referenceLimbLength=limbLength;
   }
  }
  meshes[slot]=mesh;materials[slot]=material;selected[slot]='';
 }
 return {meshes,materials,selected};
}
export function updateIdentityVisuals(v:IdentityVisuals,raw:IdentityMarkings|undefined,
 armorStyle:string,top:string,rigStyle:string){
 const front=armorAttachmentFrame(armorStyle,top).front.x;
 // A chest label is a high-mounted identifier, not a label through magazines.
 v.meshes.chest.position.x=Math.max(7.3,front+1.05);
 v.meshes.chest.position.y=rigStyle==='full-chest'?5.1:4.0;
 for(const slot of MARKING_SLOTS){
  const id=raw?.[slot]??'';
  const mesh=v.meshes[slot];
  // The independent chest panel is only appropriate on visible tactical vests.
  const allowed=slot!=='chest'||!['armor-bare','soft-slick'].includes(armorStyle);
  const valid=identityMarking(id);
  const visible=!!valid&&valid.slots.includes(slot)&&allowed;
  mesh.visible=visible;
  if(!visible)continue;
  if(v.selected[slot]===id)continue;
  const texture=textureFor(id);if(!texture){mesh.visible=false;continue;}
  const material=v.materials[slot];
  material.map=texture;material.needsUpdate=true;v.selected[slot]=id;
 }
}
