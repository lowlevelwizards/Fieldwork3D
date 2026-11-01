/** Equipment 19.03: low-resolution, rigid attachment shapes with true mount
 * coordinates. Only built on configuration changes, never per render frame.
 */
import * as THREE from 'three';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
const block=(root:THREE.Group,x:number,y:number,z:number,
 w:number,h:number,d:number,m:THREE.Material)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
};
export function buildWeaponAccessories(raw:WeaponConfiguration,
 steel:THREE.Material,dark:THREE.Material,
 lensMaterial:THREE.Material=steel):THREE.Group{
 const assembly=resolveWeaponAssembly(raw),g=new THREE.Group(),parts=assembly.mounted;
 const optic=parts.optic;
 if(optic.id==='optic-reflex'){
  block(g,optic.mountX,3.8,0,4,1.1,3,dark);
  block(g,optic.mountX,5,0,3.3,2.8,.75,steel);
  block(g,optic.mountX+1.3,5,0,.55,2.3,2.9,dark);
 }else if(optic.id==='optic-magnified'){
  block(g,optic.mountX,5,0,8,2.6,2.6,dark);
  block(g,optic.mountX+3,5,0,1.1,3.2,3.2,steel);
  block(g,optic.mountX-3,5,0,1.2,2.7,2.7,steel);
  block(g,optic.mountX,3.3,0,2,1.1,1.8,steel);
 }
 const muzzle=parts.muzzle;
 const ext=muzzle.muzzleExtension??0;
 if(ext>0){
  const radius=muzzle.id==='muzzle-suppressor'?2.65:2.05;
  block(g,muzzle.mountX+ext/2,0,0,ext,radius,radius,
   muzzle.id==='muzzle-suppressor'?dark:steel);
  if(muzzle.id==='muzzle-brake'){
   block(g,muzzle.mountX+ext*.68,0,0,.32,2.4,2.7,dark);
  }
 }
 if(parts.foregrip.id==='foregrip-handstop')
  block(g,assembly.supportX,-2.35,0,2.3,1.9,3.2,dark);
 if(parts.foregrip.id==='foregrip-vertical'){
  block(g,assembly.supportX,-3.5,0,2.5,5.2,2.5,dark);
  block(g,assembly.supportX,-1.2,0,4,1,3.4,steel);
 }
 if(parts.light.id==='light-compact'){
  const light=parts.light;
  block(g,light.mountX,light.mountY,light.mountZ,4.6,2.2,2.6,dark);
  block(g,light.mountX+2.25,light.mountY,light.mountZ,1,2.6,3,steel);
  const lens=block(g,light.mountX+2.85,light.mountY,light.mountZ,
   .25,1.5,2.1,lensMaterial);
  lens.name='weapon-light-lens';lens.visible=false;
  block(g,light.mountX-2,light.mountY+.9,light.mountZ,2,.8,2.5,steel);
 }
 if(parts.sling.id==='sling-two-point'){
  // Rigid sling mounting hardware stays on the gun. The actual fabric
  // loop is positioned by the shared operator rig, not baked to receiver.
  block(g,-9,-.5,3,1.4,1,1.2,steel);
  block(g,10,-.5,3,1.4,1,1.2,steel);
 }
 return g;
}
