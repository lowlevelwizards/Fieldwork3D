/** R21 half masks — fitted industrial cup and one-piece tactical nose. */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import {outlet} from './operator-d2-mask-geometry.ts';
import {simpleShell,opaquePolygon}
 from './operator-d2-mask-simple-geometry.ts';
import {fittedHarness,mountedFilter}
 from './operator-d2-mask-r21-geometry.ts';

/** Extend the existing shell with a FLAT, integrated nose crest.
 * Same hero mesh; no independent triangle jutting off the front.
 */
function integratedNoseCrest(shell:THREE.Mesh){
 const geometry=shell.geometry as THREE.BufferGeometry;
 const p=geometry.getAttribute('position') as THREE.BufferAttribute;
 const n=geometry.getAttribute('normal') as THREE.BufferAttribute;
 const coords=Array.from(p.array as ArrayLike<number>);
 const normals=Array.from(n.array as ArrayLike<number>);
 const crest:readonly (readonly [number,number,number])[]=[
  [-1.14,2.30,-5.13],[1.14,2.30,-5.13],
  [.45,3.02,-5.13],[-.45,3.02,-5.13]
 ];
 for(const i of [0,2,1,0,3,2]){
  coords.push(...crest[i]);normals.push(0,0,-1);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 shell.geometry=g;geometry.dispose();
 shell.userData.d2IntegratedNose=true;
}
/** A low shallow *guard*, not a second respirator. */
export function buildSimpleTactical(root:THREE.Group,m:MaskMaterials,
 meshMode:boolean):void{
 const shell=simpleShell(root,m.rubber,'rigid-half-mask-face',[
  {y:-.68,halfWidth:2.47,frontHalf:1.52,cheekHalf:2.09,
   frontZ:-4.95,cheekZ:-4.78,cornerZ:-3.70,returnZ:-1.73},
  {y:.80,halfWidth:4.09,frontHalf:1.69,cheekHalf:3.14,
   frontZ:-5.20,cheekZ:-4.92,cornerZ:-3.79,returnZ:-1.75},
  {y:2.30,halfWidth:3.85,frontHalf:1.45,cheekHalf:3.02,
   frontZ:-5.13,cheekZ:-4.84,cornerZ:-3.90,returnZ:-1.82}
 ]);
 integratedNoseCrest(shell);
 opaquePolygon(root,m.filters,
  meshMode?'wide-mesh-grille':'hard-nose-panel',[
   [-2.58,1.68],[2.58,1.68],[2.53,.35],
   [1.72,-.18],[-1.72,-.18],[-2.53,.35]
  ],-5.36);
 fittedHarness(root,m.hardware,'half-strap',[
  {position:[3.75,1.43,-3.92],normal:[1,0,0]}
 ]);
}
/** Distinct industrial cup — mounted filters overlap BOTH socket and seal. */
export function buildSimpleIndustrial(root:THREE.Group,m:MaskMaterials,
 compact:boolean):void{
 simpleShell(root,m.rubber,'respirator-triangular-seal',[
  {y:-.85,halfWidth:1.94,frontHalf:1.20,cheekHalf:1.68,
   frontZ:-5.04,cheekZ:-4.83,cornerZ:-3.73,returnZ:-1.98},
  {y:.63,halfWidth:3.07,frontHalf:1.47,cheekHalf:2.52,
   frontZ:-5.32,cheekZ:-5.04,cornerZ:-3.81,returnZ:-1.91},
  {y:2.22,halfWidth:2.63,frontHalf:1.21,cheekHalf:2.13,
   frontZ:-5.39,cheekZ:-5.03,cornerZ:-3.94,returnZ:-2.16},
  {y:3.40,halfWidth:.86,frontHalf:.57,cheekHalf:.73,
   frontZ:-5.48,cheekZ:-5.26,cornerZ:-4.39,returnZ:-2.76}
 ]);
 if(compact){
  // Mode swaps the outlet for ONE center cartridge; do not pile modules.
  mountedFilter(root,m,'compact-front-filter',
   [0,1.04,-5.39],[0,1.02,-5.89],[0,0,-1],1.12,.75);
 }else{
  outlet(root,m,'respirator-valve',0,.08,-5.59,.63);
  for(const sign of [-1,1] as const)
   mountedFilter(root,m,'dual-filter-canister',
    [sign*2.39,1.08,-5.10],
    [sign*2.88,1.04,-5.48],[sign*.65,0,-.76],1.20,.77);
 }
 fittedHarness(root,m.hardware,'respirator-harness',[
  {position:[2.72,1.64,-4.95],normal:[1,0,0]},
  {position:[1.20,3.03,-4.98],normal:[1,0,0]}
 ]);
}
