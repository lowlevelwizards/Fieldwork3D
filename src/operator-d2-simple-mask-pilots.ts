/** R21: preserve the good M40 while restoring R13's M50 visor identity. */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import type {ShellRing} from './operator-d2-mask-simple-geometry.ts';
import {outlet} from './operator-d2-mask-geometry.ts';
import {filterPod} from './operator-d2-mask-r10-geometry.ts';
import {simpleShell,eyeShape,solidWedge}
 from './operator-d2-mask-simple-geometry.ts';
import {opaqueLensOnSurface,contouredPanorama,fittedHarness}
 from './operator-d2-mask-r21-geometry.ts';

const M40_RINGS:readonly ShellRing[]=[
 {y:-1.08,halfWidth:2.95,frontHalf:1.72,cheekHalf:2.38,
  frontZ:-4.87,cheekZ:-4.70,cornerZ:-3.64,returnZ:-1.78},
 {y:1.12,halfWidth:4.12,frontHalf:1.65,cheekHalf:3.13,
  frontZ:-5.15,cheekZ:-4.96,cornerZ:-3.78,returnZ:-1.74},
 {y:3.06,halfWidth:4.20,frontHalf:1.85,cheekHalf:3.23,
  frontZ:-5.02,cheekZ:-4.88,cornerZ:-3.83,returnZ:-1.76},
 {y:5.68,halfWidth:3.80,frontHalf:2.01,cheekHalf:3.09,
  frontZ:-4.91,cheekZ:-4.78,cornerZ:-3.86,returnZ:-2.00}
];
export function buildSimpleM40(root:THREE.Group,m:MaskMaterials):void{
 simpleShell(root,m.rubber,'m40-full-facepiece',M40_RINGS);
 for(const sign of [-1,1] as const)
  opaqueLensOnSurface(root,m,'m40-angular-eyepiece',
   eyeShape(sign*2.03,3.95,1.14,1.00,'angular'),
   M40_RINGS,.22,1.11);
 outlet(root,m,'m40-exhalation-front',0,.27,-5.46,.95);
 // Keep the successful R20 M40 canister silhouette exactly intact.
 filterPod(root,m.hardware,'m40-single-side-port',
  [3.21,1.12,-5.26],[1.05,.37,.96],[.8,0,-1]);
 filterPod(root,m.filters,'m40-projecting-side-canister',
  [3.88,1.02,-6.18],[1.48,1.22,.94],[.75,0,-1]);
 fittedHarness(root,m.hardware,'m40-harness',[
  {position:[3.93,2.03,-3.84],normal:[1,0,0]},
  {position:[3.89,4.89,-3.93],normal:[1,0,0]}
 ]);
}
const M50_RINGS:readonly ShellRing[]=[
 {y:-1.05,halfWidth:2.86,frontHalf:1.74,cheekHalf:2.39,
  frontZ:-4.98,cheekZ:-4.70,cornerZ:-3.76,returnZ:-1.75},
 {y:1.08,halfWidth:4.02,frontHalf:1.54,cheekHalf:3.18,
  frontZ:-5.22,cheekZ:-4.92,cornerZ:-3.73,returnZ:-1.70},
 {y:2.60,halfWidth:4.19,frontHalf:1.86,cheekHalf:3.12,
  frontZ:-5.00,cheekZ:-4.83,cornerZ:-3.76,returnZ:-1.74},
 {y:5.70,halfWidth:4.18,frontHalf:2.32,cheekHalf:3.28,
  frontZ:-4.95,cheekZ:-4.76,cornerZ:-3.77,returnZ:-1.85}
];
export function buildSimpleM50(root:THREE.Group,m:MaskMaterials):void{
 simpleShell(root,m.rubber,'m50-facepiece-rim-and-chin',M50_RINGS);
 // Contoured R13 profile: one large pane, central nose NOTCH and temple wrap.
 contouredPanorama(root,m,'m50-one-piece-panoramic-visor');
 // One confident nasal assembly; recess it under the glass notch.
 solidWedge(root,m.rubber,'m50-raised-nasal-bridge',[
  [-.52,2.96],[.52,2.96],[1.18,1.35],
  [.83,.24],[-.83,.24],[-1.18,1.35]
 ],-5.64,-5.11);
 // Low, compact embedded filters: less slab and less unnecessary depth.
 for(const sign of [-1,1] as const){
  solidWedge(root,m.filters,'m50-twin-low-cheek-filter',[
   [sign*2.18,2.02],[sign*3.53,2.06],
   [sign*3.70,1.08],[sign*3.32,-.25],
   [sign*2.53,-.42],[sign*2.03,.46]
  ],-5.28,-4.69);
 }
 outlet(root,m,'m50-low-exhale-module',0,-.12,-5.59,.88);
 fittedHarness(root,m.hardware,'m50-harness',[
  {position:[4.06,2.00,-3.85],normal:[1,0,0]},
  {position:[4.05,4.81,-3.85],normal:[1,0,0]}
 ]);
}
