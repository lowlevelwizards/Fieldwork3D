/** H22: Developer-only anatomical ear guides for Operator Studio.
 * Opt-in via ?helmetAnatomy=1. Never imported by the tactical simulation;
 * no physics, save data, frame loops, or permanent visible operator parts.
 */
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY} from './operator-head-anatomy.ts';
export const HELMET_ANATOMY_GUIDE_NAME='h22-debug-ear-landmarks';
export function createHelmetAnatomyGuide():THREE.Group{
 const group=new THREE.Group();group.name=HELMET_ANATOMY_GUIDE_NAME;
 const a=CUBE_HEAD_ANATOMY;
 const points:THREE.Vector3[]=[];
 // One rectangular ear envelope on each lateral cube face; the side
 // silhouette remains readable through real shell geometry.
 for(const sign of [-1,1]){
  const x=sign*4.18, front=a.earZ-1.35,rear=a.earZ+1.35;
  const corners=[
   new THREE.Vector3(x,a.earTop,front),
   new THREE.Vector3(x,a.earTop,rear),
   new THREE.Vector3(x,a.earBottom,rear),
   new THREE.Vector3(x,a.earBottom,front)
  ];
  for(let i=0;i<4;i++)points.push(corners[i],corners[(i+1)%4]);
  points.push(new THREE.Vector3(x,a.earCenter,a.earZ-.28),
   new THREE.Vector3(x,a.earCenter,a.earZ+.28));
 }
 const geometry=new THREE.BufferGeometry().setFromPoints(points);
 const material=new THREE.LineBasicMaterial({color:0x64e5dd,
  depthTest:false,depthWrite:false,transparent:true,opacity:.92});
 const lines=new THREE.LineSegments(geometry,material);
 lines.name='inferred-ear-bounds-not-head-geometry';
 lines.renderOrder=1100;lines.frustumCulled=false;group.add(lines);
 group.userData.headLocal=true;group.userData.debugOnly=true;
 return group;
}
