/** R16 pilot masks: bold planes and opaque lenses. No boolean eye cutouts. */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import {outlet} from './operator-d2-mask-geometry.ts';
import {filterPod} from './operator-d2-mask-r10-geometry.ts';
import {simpleShell,opaqueEye,eyeShape,panorama,solidWedge,
 simpleHarness} from './operator-d2-mask-simple-geometry.ts';
export function buildSimpleM40(root:THREE.Group,m:MaskMaterials):void{
 simpleShell(root,m.rubber,'m40-full-facepiece',[
  {y:-1.08,halfWidth:2.95,frontHalf:1.72,cheekHalf:2.38,
   frontZ:-4.87,cheekZ:-4.70,cornerZ:-3.64,returnZ:-1.78},
  {y:1.12,halfWidth:4.12,frontHalf:1.65,cheekHalf:3.13,
   frontZ:-5.15,cheekZ:-4.96,cornerZ:-3.78,returnZ:-1.74},
  {y:3.06,halfWidth:4.20,frontHalf:1.85,cheekHalf:3.23,
   frontZ:-5.02,cheekZ:-4.88,cornerZ:-3.83,returnZ:-1.76},
  {y:5.68,halfWidth:3.80,frontHalf:2.01,cheekHalf:3.09,
   frontZ:-4.91,cheekZ:-4.78,cornerZ:-3.86,returnZ:-2.00}
 ]);
 for(const sign of [-1,1] as const){
  const cx=sign*2.03;
  opaqueEye(root,m,'m40-angular-eyepiece',
   eyeShape(cx,3.95,1.14,1.00,'angular'),-5.14,1.11);
 }
 outlet(root,m,'m40-exhalation-front',0,.27,-5.46,.95);
 filterPod(root,m.hardware,'m40-single-side-port',
  [3.21,1.12,-5.26],[1.05,.37,.96],[.8,0,-1]);
 filterPod(root,m.filters,'m40-projecting-side-canister',
  [3.88,1.02,-6.18],[1.48,1.22,.94],[.75,0,-1]);
 simpleHarness(root,m.hardware,'m40-harness',[2.03,4.89]);
}
export function buildSimpleM50(root:THREE.Group,m:MaskMaterials):void{
 simpleShell(root,m.rubber,'m50-facepiece-rim-and-chin',[
  {y:-1.05,halfWidth:2.86,frontHalf:1.74,cheekHalf:2.39,
   frontZ:-4.98,cheekZ:-4.70,cornerZ:-3.76,returnZ:-1.75},
  {y:1.08,halfWidth:4.02,frontHalf:1.54,cheekHalf:3.18,
   frontZ:-5.22,cheekZ:-4.92,cornerZ:-3.73,returnZ:-1.70},
  {y:2.60,halfWidth:4.19,frontHalf:1.86,cheekHalf:3.12,
   frontZ:-5.00,cheekZ:-4.83,cornerZ:-3.76,returnZ:-1.74},
  {y:5.70,halfWidth:4.18,frontHalf:2.32,cheekHalf:3.28,
   frontZ:-4.95,cheekZ:-4.76,cornerZ:-3.77,returnZ:-1.85}
 ]);
 // Frame is deliberately just a slightly larger black pane behind ONE
 // continuous three-panel opaque glass surface. No aperture or triangles.
 panorama(root,m.hardware,'m50-panoramic-frame',
  5.48,2.36,2.59,4.00,-5.37,-4.89);
 panorama(root,m.lens,'m50-one-piece-panoramic-visor-lens',
  5.27,2.58,2.45,3.82,-5.54,-5.00);
 solidWedge(root,m.rubber,'m50-raised-nasal-bridge',[
  [-.58,2.99],[.58,2.99],[1.33,1.38],
  [.87,.22],[-.87,.22],[-1.33,1.38]
 ],-5.76,-5.24);
 for(const sign of [-1,1] as const){
  solidWedge(root,m.filters,'m50-twin-low-cheek-filter',[
   [sign*2.25,2.03],[sign*3.58,2.10],
   [sign*3.69,1.10],[sign*3.35,-.28],
   [sign*2.57,-.48],[sign*2.04,.51]
  ],-5.28,-4.78);
 }
 outlet(root,m,'m50-low-exhale-module',0,-.13,-5.61,.86);
 simpleHarness(root,m.hardware,'m50-harness',[2.00,4.81]);
}
