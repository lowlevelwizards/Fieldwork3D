/** V17.1: a single faceted, vertex-colored miniature flash. No extra
 * sprite, texture, material group or draw call. Symmetric local geometry
 * remains valid when the pistol flash is reparented to the actor root. */
import * as THREE from 'three';
import type {WeaponId} from '../breach-combat.ts';
import type {MuzzleAttachment} from '../breach-combat-cues.ts';
const points:readonly (readonly [number,number,number])[]=[
 [3.5,0,0],[-3.5,0,0],[0,3.5,0],[0,-3.5,0],[0,0,3.5],[0,0,-3.5]
];
const faces=[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]] as const;
export function createMuzzleFlashGeometry():THREE.BufferGeometry{
 const positions:number[]=[],colors:number[]=[];
 const tip=new THREE.Color(0xffb35e),core=new THREE.Color(0xfff7de);
 for(const [a,b,c] of faces){
  const p=points[a],q=points[b],r=points[c];
  const center=[(p[0]+q[0]+r[0])*.40/3,(p[1]+q[1]+r[1])*.40/3,(p[2]+q[2]+r[2])*.40/3];
  for(const [u,v] of [[p,q],[q,r],[r,p]]){
   positions.push(...u,...v,...center);
   colors.push(tip.r,tip.g,tip.b,tip.r,tip.g,tip.b,core.r,core.g,core.b);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeBoundingSphere();
 return geometry;
}
const aspects={
 carbine:{x:1.35,y:.84,z:.84},smg:{x:1.08,y:.80,z:.80},
 rifle:{x:1.55,y:.98,z:.98},shotgun:{x:1.18,y:1.20,z:1.20},
 pistol:{x:.87,y:.87,z:.87},suppressed:{x:1.05,y:.72,z:.72}
} as const;
export function muzzleFlashAspect(weapon:WeaponId,secondary:boolean,attachment:MuzzleAttachment){
 return secondary?aspects.pistol:attachment==='muzzle-suppressor'?aspects.suppressed:aspects[weapon];
}
