/** VA2: deterministic item-shot composition. A model must fit the entire
 * viewport; category presets only change the angle and final aspect ratio.
 * No gameplay or wardrobe silhouettes are created here.
 */
import * as THREE from 'three';
export type ArmoryShotCategory=
 'weapon'|'head'|'armor'|'rig'|'belt'|'backpack'|'small';
export function armoryShotPreset(category:ArmoryShotCategory){
 switch(category){
  case 'weapon':
   return {width:320,height:176,direction:new THREE.Vector3(.12,.14,1).normalize()};
  case 'head':
   return {width:232,height:212,direction:new THREE.Vector3(1,.18,.76).normalize()};
  case 'armor':case 'rig':
   return {width:256,height:216,direction:new THREE.Vector3(1,.2,.75).normalize()};
  case 'belt':
   return {width:256,height:204,direction:new THREE.Vector3(.9,.63,.82).normalize()};
  case 'backpack':
   return {width:236,height:212,direction:new THREE.Vector3(-1,.22,.8).normalize()};
  default:
   return {width:212,height:212,direction:new THREE.Vector3(.83,.35,1).normalize()};
 }
}
/** Project all 8 corners onto the camera's view plane, so long guns, tall
 * antennae and side-mounted packs always fit regardless of their orientation.
 */
export function frameArmoryObject(bounds:THREE.Box3,
 category:ArmoryShotCategory,fovDegrees=34){
 const preset=armoryShotPreset(category);
 const center=bounds.getCenter(new THREE.Vector3());
 const forward=preset.direction;
 const right=new THREE.Vector3().crossVectors(
  new THREE.Vector3(0,1,0),forward).normalize();
 const up=new THREE.Vector3().crossVectors(forward,right).normalize();
 let halfX=0,halfY=0,halfDepth=0;
 const corner=new THREE.Vector3();
 for(let a=0;a<8;a++){
  corner.set((a&1)?bounds.max.x:bounds.min.x,
   (a&2)?bounds.max.y:bounds.min.y,
   (a&4)?bounds.max.z:bounds.min.z).sub(center);
  halfX=Math.max(halfX,Math.abs(corner.dot(right)));
  halfY=Math.max(halfY,Math.abs(corner.dot(up)));
  halfDepth=Math.max(halfDepth,Math.abs(corner.dot(forward)));
 }
 const vtan=Math.tan(fovDegrees*Math.PI/360);
 const htan=vtan*(preset.width/preset.height);
 const distance=Math.max(halfX/htan,halfY/vtan,1)*1.12+
  halfDepth+.8;
 return {center,position:center.clone().addScaledVector(forward,distance),
  width:preset.width,height:preset.height,distance};
}
