/** Sculpted HK four-claw bridge. One geometry/one draw call, built only on
 * config changes. Shared between G3, HK33/HK53 and MP5 receiver families.
 * Visual-only contract: equipment IDs, sight height and ballistics unchanged.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HK_BLACK_METAL} from './weapon-visual-palette.ts';

export const HK_CLAW_VISUAL=Object.freeze({
  rearX:-4.60,frontX:1.25,footZ:1.13,
  railCenterX:-1.52,railCenterY:3.35,
  railLength:7.75,railWidth:2.48,railHeight:.50,
  /** Visible upper supporting surface, not gameplay sight height. */
  supportTopY:3.60
});

function footGeometry(x:number,z:number):THREE.BufferGeometry{
 // Tapered exterior profile with broad, engaged lower feet, rising slim
 // shoulders and four explicit claws. No tiny teeth or detached box stacks.
 const outline=new THREE.Shape();
 const profile:readonly (readonly [number,number])[]=[
  [-.62,1.66],[.53,1.66],[.64,1.83],
  [.43,2.29],[.31,2.78],[.65,3.16],
  [-.49,3.16],[-.28,2.78],[-.43,2.29],[-.68,1.83]
 ];
 outline.moveTo(...profile[0]);
 for(const point of profile.slice(1))outline.lineTo(...point);
 outline.closePath();
 const geo=new THREE.ExtrudeGeometry(outline,{
  depth:.69,steps:1,bevelEnabled:false,curveSegments:1
 });
 geo.translate(x,0,z-.345);
 return geo;
}
export function addHKClawRail(root:THREE.Group):void{
 const p=HK_CLAW_VISUAL;
 const geometries:THREE.BufferGeometry[]=[];
 for(const x of [p.rearX,p.frontX])
  for(const z of [-p.footZ,p.footZ])
   geometries.push(footGeometry(x,z));
 // The broad low bridge is ONE continuous load-bearing body. Side lips sit
 // below its upper surface so optic bases never hover above a decorative rib.
 const bridge=new THREE.BoxGeometry(p.railLength,p.railHeight,p.railWidth);
 bridge.translate(p.railCenterX,p.railCenterY,0);
 geometries.push(bridge);
 // Subtle mounting cheeks, no high micro-ribs or thick floating second rail.
 for(const z of [-1.29,1.29]){
  const lip=new THREE.BoxGeometry(7.48,.30,.22);
  lip.translate(p.railCenterX,3.36,z);
  geometries.push(lip);
 }
 const geometry=mergeGeometries(geometries,false);
 for(const component of geometries)component.dispose();
 if(!geometry)throw Error('HK claw bridge geometry merge failed');
 const mount=new THREE.Mesh(geometry,HK_BLACK_METAL);
 mount.name='family-art-hk-claw-assembly';
 mount.userData.hkClawMount='assembly';
 mount.userData.hkClawSupportTopY=p.supportTopY;
 mount.userData.hkClawFeet=4;
 mount.castShadow=true;mount.receiveShadow=true;
 root.add(mount);
}
