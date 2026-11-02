/** Distinct low-poly firearm silhouettes in the shared shoulder-relative axes.
 * Geometry is constructed only at rig creation or a planning-phase weapon swap.
 * All barrels terminate at model-local X = 19.5, the baseline shot muzzle.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import {resolveWeaponAssembly,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
type Part=readonly [number,number,number,number,number,number,0|1];
/** x, y, z, width, height, depth, material (0=steel, 1=dark). */
const PARTS:Record<WeaponId,readonly Part[]>={
 smg:[
  [-1,0,0,11,3.5,3.6,0],[6,0,0,7,2.5,3.3,1],
  [13.2,0,0,12.6,1.65,1.8,0],[-10.3,-.5,0,6.4,3.1,3.2,1],
  [-12.6,0,0,1.8,4.3,3.4,1],[-6.3,.3,0,2.7,2.2,2.5,0],
  [1.7,-2.5,0,3.6,3.2,3,1],[-1,2.1,0,7,.8,1.7,0],
  [8.5,-1.4,0,4,1.2,2.8,1]
 ],
 carbine:[
  [-1,0,0,12,3.5,3.6,0],[9.5,.2,0,11.5,3,3.5,1],
  [17,0,0,5,1.55,1.55,0],[19,0,0,1,2.25,2.2,1],
  [-10,-.4,0,7,3.1,3.4,1],[-12.8,-.3,0,1.4,4.8,3.9,1],
  [-5.5,.8,0,3.2,2.3,3.1,0],[0,-2.3,0,3.6,3.2,3.1,1],
  [8.5,2.1,0,13.5,.85,1.65,0],[8,-1.5,0,9,.8,3.6,1]
 ],
 rifle:[
  [-2,0,0,13.5,4,4.2,0],[9,.1,0,12,3.1,3.8,1],
  [16.7,0,0,5.6,1.9,2,0],[19.05,0,0,.9,2.5,2.6,1],
  [-10.1,-.6,0,6.7,4.3,4,1],[-12.8,-.5,0,1.4,5.3,4.8,1],
  [-4,-2.7,0,3.7,3.8,3.2,1],[-.9,2.5,0,10,.7,1.75,0],
  [8,2.4,0,11,.75,1.9,0],[8.5,-1.7,0,9,1,3.6,1],
  [1,1,2.25,4,1,1.1,0]
 ],
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
const DETAILS:Record<WeaponId,readonly Part[]>={
 smg:[
  [1.7,-4.85,0,2.3,2.2,2.4,1],[-5.4,-1,0,2.4,2.2,2.4,0],
  [8.4,1.7,0,5.8,.9,3.2,0],[13.5,-.8,0,5.2,.65,2.1,1],
  [-11.5,-1.5,0,1.6,3.5,3.5,1],[1.7,-6.1,0,2.2,.7,2.1,0]
 ],
 carbine:[
  [0,-5.0,0,2.2,2.9,2.4,1],[-4.5,-1.0,0,2.7,1.9,2.5,0],
  [8.5,1.7,0,10.1,.85,3.4,0],[10.2,-1.95,0,7.3,.6,3.5,1],
  [15.4,2.15,0,1.2,1.15,1.7,0],
  [-10.4,-2.0,0,2.2,3.0,2.9,1],[-11.65,1.2,0,1.3,.9,2.7,0]
 ],
 rifle:[
  [-4,-5.4,0,2.7,2.8,2.65,1],[-4.5,-1.2,0,3.1,1.75,2.8,0],
  [7.9,1.9,0,12.4,.85,3.7,0],[9,-1.9,0,9.4,.7,3.2,1],
  [15.1,2.1,0,1.0,1.2,1.7,0],
  [-11.55,-2.05,0,2.0,3.5,3.0,1]
 ],
 shotgun:[
  [-2.9,-5.0,0,2.4,2.7,2.8,1],[-4.7,-1.0,0,2.8,2.0,3.0,0],
  [7.9,-2.8,0,8.0,.85,3.4,1],[5.8,3.0,0,9.5,.65,1.8,0],
  [13.5,1.4,0,2.2,.45,2.45,1],[-11.8,-2.1,0,2.0,3.1,3.2,1]
 ]
};
export const weaponDetailParts=(id:WeaponId):readonly Part[]=>DETAILS[id];

export function weaponSilhouetteParts(id:WeaponId):readonly Part[]{return PARTS[id];}
export function buildWeaponSilhouette(id:WeaponId,
 steel:THREE.Material,dark:THREE.Material,
 config?:WeaponConfiguration):THREE.Group{
 const g=new THREE.Group();
 const stockX=config&&config.weapon===id?resolveWeaponAssembly(config).stockX:-13.5;
 for(const [baseX,y,z,baseW,h,d,mat] of PARTS[id]){
  let x=baseX,w=baseW;
  // Stock stays one continuous physical object when the buttplate length changes.
  if(baseX< -12){x=stockX+baseW/2;}
  else if(baseX< -8){const front=baseX+baseW/2;
   w=Math.max(1.2,front-stockX);x=(front+stockX)/2;}
  const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
  const mesh=new THREE.Mesh(geometry,mat===0?steel:dark);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 }
 for(const [x,y,z,w,h,d,materialIndex] of DETAILS[id]){
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
}
