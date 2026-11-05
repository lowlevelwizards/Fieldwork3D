/** R21: softer GP5 rubber-hood profile; M17 is a protected polish-only asset. */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import type {ShellRing} from './operator-d2-mask-simple-geometry.ts';
import {outlet,canister} from './operator-d2-mask-geometry.ts';
import {simpleShell,simpleHood,opaqueEye,eyeShape,solidWedge}
 from './operator-d2-mask-simple-geometry.ts';
import {opaqueLensOnSurface,fittedHarness}
 from './operator-d2-mask-r21-geometry.ts';
export function buildSimpleGp5(root:THREE.Group,m:MaskMaterials){
 const hood=simpleHood(root,m.rubber,'gp5-one-piece-rubber-hood',[
  [-2.25,3.45,-4.25,3.85],
  [-.75,4.24,-4.60,4.27],
  [2.30,4.50,-4.88,4.49],
  [5.65,4.50,-4.84,4.49],
  [6.65,4.45,-4.63,4.42],
  [7.05,4.34,-4.44,4.31],
  [7.55,4.16,-4.18,4.15]
 ]);
 const shell=hood.getObjectByName('hood-crown');
 if(shell) shell.userData.d2OpaqueHood=true;
 for(const sign of [-1,1] as const)
  opaqueEye(root,m,'gp5-round-eye',
   eyeShape(sign*1.85,3.65,1.25,1.20,'round'),
   -5.09,1.19);
 // One tapered mouth cone, joined under the eyepieces.
 solidWedge(root,m.rubber,'gp5-conical-mouth',[
  [-1.66,2.20],[1.66,2.20],[1.38,.04],
  [.96,-.69],[-.96,-.69],[-1.38,.04]
 ],-5.43,-4.71);
 // Single downward breathing canister, short socket intentionally overlaps.
 canister(root,m.hardware,'gp5-front-port',
  0,-.46,-5.73,1.13,.65,0,-2.40);
 canister(root,m.filters,'gp5-central-canister',
  0,-1.58,-5.94,1.40,2.02,0,-3.60);
}
const M17_RINGS:readonly ShellRing[]=[
 {y:-1.10,halfWidth:3.07,frontHalf:1.58,cheekHalf:2.61,
  frontZ:-4.98,cheekZ:-4.83,cornerZ:-3.69,returnZ:-1.81},
 {y:1.30,halfWidth:4.52,frontHalf:1.69,cheekHalf:3.36,
  frontZ:-5.12,cheekZ:-5.02,cornerZ:-3.76,returnZ:-1.75},
 {y:3.25,halfWidth:4.35,frontHalf:1.95,cheekHalf:3.32,
  frontZ:-4.91,cheekZ:-4.79,cornerZ:-3.83,returnZ:-1.82},
 {y:5.72,halfWidth:3.89,frontHalf:2.05,cheekHalf:3.15,
  frontZ:-4.86,cheekZ:-4.76,cornerZ:-3.90,returnZ:-2.05}
];
export function buildSimpleM17(root:THREE.Group,m:MaskMaterials){
 simpleShell(root,m.rubber,'m17-full-facepiece',M17_RINGS);
 for(const sign of [-1,1] as const){
  // Preserve BOTH integrated pocket silhouettes and original cheek fullness.
  solidWedge(root,m.rubber,'m17-integrated-cheek-filter',[
   [sign*1.72,2.35],[sign*3.50,2.41],
   [sign*3.88,1.39],[sign*3.35,-.30],
   [sign*2.25,-.68],[sign*1.50,.20]
  ],-5.50,-4.65);
  opaqueLensOnSurface(root,m,'m17-round-eyepiece',
   eyeShape(sign*1.91,3.91,1.24,1.14,'soft'),
   M17_RINGS,.23,1.14);
 }
 outlet(root,m,'m17-center-exhale-speech',0,.24,-5.67,.94);
 fittedHarness(root,m.hardware,'m17-harness',[
  {position:[4.26,2.05,-3.90],normal:[1,0,0]},
  {position:[4.04,4.89,-3.93],normal:[1,0,0]}
 ]);
}
