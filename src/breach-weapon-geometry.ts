/** Distinct low-poly firearm silhouettes in the shared shoulder-relative axes.
 * Geometry is constructed only at rig creation or a planning-phase weapon swap.
 * All barrels terminate at model-local X = 19.5, the baseline shot muzzle.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import {resolveWeaponAssembly,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {readWeaponFamilyBuild,initialWeaponFamilyBuild} from './equipment-weapon-families.ts';
import {buildModularWeaponSilhouette} from './breach-modular-weapon-geometry.ts';
import {measureVisibleStockContact}
 from './breach-stock-contact-surface.ts';
import {addHKClawRail,addHKRailVerticalGrip} from './weapons/geometry/hk-rail-accessories.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
type Part=readonly [number,number,number,number,number,number,0|1];
/** x, y, z, width, height, depth, material (0=steel, 1=dark). */
const PARTS:Partial<Record<WeaponId,readonly Part[]>>={
 shotgun:[
  [-2,0,0,11.5,4.7,4.3,0],[10.8,1,0,17.4,2,2.1,0],
  [11.8,-1.4,0,15.4,1.6,1.7,0],[7,-.1,0,8.6,3.7,3.9,1],
  [-10.1,-.9,0,7,4.3,4,1],[-12.8,-.8,0,1.4,5.2,4.5,1],
  [-2.9,-3.3,0,3,2.3,2.5,1],[-1.2,2.5,0,6.6,.65,1.2,0],
  [18.8,1,0,1.4,2.4,2.5,1]
 ]
};

/** Secondary authored surfaces make the four platforms recognizable while
 * retaining their authoritative grip, stock and muzzle locations. */
const DETAILS:Partial<Record<WeaponId,readonly Part[]>>={
 shotgun:[
  [-2.9,-5.0,0,2.4,2.7,2.8,1],[-4.7,-1.0,0,2.8,2.0,3.0,0],
  [7.9,-2.8,0,8.0,.85,3.4,1],[5.8,3.0,0,9.5,.65,1.8,0],
  [13.5,1.4,0,2.2,.45,2.45,1],[-11.8,-2.1,0,2.0,3.1,3.2,1]
 ]
};
/** Asymmetric exterior receiver faces, sights and handling furniture. These
 * ride outside the existing body, not on coincident old-model surfaces. */
const SIGNATURES:Partial<Record<WeaponId,readonly Part[]>>={
 shotgun:[
  [-2.4,.55,2.42,5.5,1.6,.4,1],
  [3.0,-2.05,2.26,5.3,.68,.42,0],
  [7.0,-2.05,-2.22,5.6,.64,.42,0],
  [-8.4,1.45,2.25,3.1,.65,.42,0],
  [16.4,-1.55,0,2.7,.56,1.7,1]
 ]
};
export const weaponSignatureParts=(id:WeaponId):readonly Part[]=>SIGNATURES[id]??[];

export const weaponDetailParts=(id:WeaponId):readonly Part[]=>DETAILS[id]??[];

export function weaponSilhouetteParts(id:WeaponId):readonly Part[]{return PARTS[id]??[];}
export function buildWeaponSilhouette(id:WeaponId,
 steel:THREE.Material,dark:THREE.Material,
 config?:WeaponConfiguration):THREE.Group{
 const familyBuild=config?.weapon===id?
  readWeaponFamilyBuild(config.build,id):undefined;
 if(familyBuild){
  const root=buildModularWeaponSilhouette(familyBuild,steel,dark,
   !config||config.slots.muzzle==='muzzle-bare');
  if(familyBuild.family==='hk'&&config?.slots.opticMount==='optic-hk-claw')
   addHKClawRail(root);
  if(familyBuild.parts.handguard==='hk-mp5-trirail'&&
   config?.slots.foregrip==='foregrip-vertical')addHKRailVerticalGrip(root);
  // Read-only art datum. Build-time only, never a second shot socket.
  root.userData.visibleStockContact=config?
    measureVisibleStockContact(root,config):null;
  return root;
 }
 const g=new THREE.Group();
 const stockX=config&&config.weapon===id?resolveWeaponAssembly(config).stockX:-13.5;
 for(const [baseX,y,z,baseW,h,d,mat] of PARTS[id]??[]){
  let x=baseX,w=baseW;
  // Stock stays one continuous physical object when the buttplate length changes.
  if(baseX< -12){x=stockX+baseW/2;}
  else if(baseX< -8){const front=baseX+baseW/2;
   w=Math.max(1.2,front-stockX);x=(front+stockX)/2;}
  const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
  const mesh=new THREE.Mesh(geometry,mat===0?steel:dark);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 }
 for(const [x,y,z,w,h,d,materialIndex] of [...(DETAILS[id]??[]),...(SIGNATURES[id]??[])]){
  const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
  const mesh=new THREE.Mesh(geometry,materialIndex===0?steel:dark);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  g.add(mesh);
 }
 return g;
}
export function clearWeaponSilhouette(g:THREE.Group){
 g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 g.clear();
 g.userData.visibleStockContact=null;
}
