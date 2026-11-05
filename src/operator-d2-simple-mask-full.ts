/** R17: full-rubber GP-5 and swollen-cheek M17.
 * All eyepieces are opaque decals on flat-mounted plates.
 */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import {outlet,canister} from './operator-d2-mask-geometry.ts';
import {simpleShell,simpleHood,opaqueEye,eyeShape,solidWedge,
 simpleHarness} from './operator-d2-mask-simple-geometry.ts';
export function buildSimpleGp5(root:THREE.Group,m:MaskMaterials){
 const hood=simpleHood(root,m.rubber,'gp5-one-piece-rubber-hood',[
  [-2.35,3.40,-4.21,3.75],
  [-.63,4.43,-4.57,4.28],
  [2.23,4.48,-4.88,4.49],
  [5.49,4.49,-4.84,4.49],
  [6.98,4.35,-4.67,4.36],
  [7.62,3.54,-4.08,3.81]
 ]);
 // Named hood/back pieces can coexist as ONE geometry. No faceted cap
 // separate from the face; these are aliases only for legacy inspections.
 const shell=hood.getObjectByName('hood-crown');
 if(shell) shell.userData.d2OpaqueHood=true;
 for(const s of [-1,1] as const)
  opaqueEye(root,m,'gp5-round-eye',
   eyeShape(s*1.87,3.78,1.19,1.17,'round'),-5.08,1.14);
 solidWedge(root,m.rubber,'gp5-conical-mouth',[
  [-2.23,2.14],[2.23,2.14],
  [1.58,.14],[1.02,-.78],[-1.02,-.78],[-1.58,.14]
 ],-5.32,-4.68);
 canister(root,m.hardware,'gp5-front-port',0,-.51,-5.67,1.18,.62,0,-2.25);
 canister(root,m.filters,'gp5-central-canister',0,-1.73,-5.88,1.41,2.07,0,-3.52);
}
export function buildSimpleM17(root:THREE.Group,m:MaskMaterials){
 simpleShell(root,m.rubber,'m17-full-facepiece',[
  {y:-1.10,halfWidth:3.07,frontHalf:1.58,cheekHalf:2.61,
   frontZ:-4.98,cheekZ:-4.83,cornerZ:-3.69,returnZ:-1.81},
  {y:1.30,halfWidth:4.52,frontHalf:1.69,cheekHalf:3.36,
   frontZ:-5.12,cheekZ:-5.02,cornerZ:-3.76,returnZ:-1.75},
  {y:3.25,halfWidth:4.35,frontHalf:1.95,cheekHalf:3.32,
   frontZ:-4.91,cheekZ:-4.79,cornerZ:-3.83,returnZ:-1.82},
  {y:5.72,halfWidth:3.89,frontHalf:2.05,cheekHalf:3.15,
   frontZ:-4.86,cheekZ:-4.76,cornerZ:-3.90,returnZ:-2.05}
 ]);
 // The two physically overlapping cheek wedges make deliberately readable
 // old-fashioned swollen filter pockets, without triangulated deformation.
 for(const s of [-1,1] as const){
  solidWedge(root,m.rubber,'m17-integrated-cheek-filter',[
   [s*1.72,2.35],[s*3.50,2.41],[s*3.88,1.39],
   [s*3.35,-.30],[s*2.25,-.68],[s*1.50,.20]
  ],-5.50,-4.65);
  opaqueEye(root,m,'m17-round-eyepiece',
   eyeShape(s*1.91,3.91,1.24,1.14,'soft'),-5.14,1.14);
 }
 outlet(root,m,'m17-center-exhale-speech',0,.24,-5.67,.94);
 simpleHarness(root,m.hardware,'m17-harness',[2.05,4.89]);
}
