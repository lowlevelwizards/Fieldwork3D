/** R18 simple lower-face masks: one shallow guard or one industrial cup,
 * two side-mounted filters only where structurally appropriate.
 */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import {outlet} from './operator-d2-mask-geometry.ts';
import {filterPod} from './operator-d2-mask-r10-geometry.ts';
import {simpleShell,solidWedge,opaquePolygon,
 simpleHarness} from './operator-d2-mask-simple-geometry.ts';
export function buildSimpleTactical(root:THREE.Group,m:MaskMaterials,
 meshMode:boolean):void{
 simpleShell(root,m.rubber,'rigid-half-mask-face',[
  {y:-.76,halfWidth:2.42,frontHalf:1.55,cheekHalf:2.03,
   frontZ:-4.95,cheekZ:-4.76,cornerZ:-3.67,returnZ:-1.70},
  {y:.78,halfWidth:4.11,frontHalf:1.67,cheekHalf:3.17,
   frontZ:-5.20,cheekZ:-4.92,cornerZ:-3.76,returnZ:-1.70},
  {y:2.34,halfWidth:3.96,frontHalf:1.45,cheekHalf:3.10,
   frontZ:-5.12,cheekZ:-4.83,cornerZ:-3.83,returnZ:-1.78}
 ]);
 // One distinctive high nose crest, deliberately joined to the shallow guard.
 solidWedge(root,m.rubber,'half-nose-rise',[
  [-1.13,2.27],[0,3.18],[1.13,2.27]
 ],-5.34,-4.86);
 opaquePolygon(root,m.filters,
  meshMode?'wide-mesh-grille':'hard-nose-panel',[
  [-2.62,1.86],[2.62,1.86],[2.56,.30],
  [1.73,-.28],[-1.73,-.28],[-2.56,.30]
 ],-5.35);
 simpleHarness(root,m.hardware,'half-strap',[1.76]);
}
export function buildSimpleIndustrial(root:THREE.Group,m:MaskMaterials,
 compact:boolean):void{
 simpleShell(root,m.rubber,'respirator-triangular-seal',[
  {y:-.88,halfWidth:1.95,frontHalf:1.23,cheekHalf:1.69,
   frontZ:-5.00,cheekZ:-4.84,cornerZ:-3.71,returnZ:-2.0},
  {y:.64,halfWidth:3.18,frontHalf:1.42,cheekHalf:2.55,
   frontZ:-5.33,cheekZ:-5.03,cornerZ:-3.84,returnZ:-1.90},
  {y:2.15,halfWidth:2.72,frontHalf:1.29,cheekHalf:2.17,
   frontZ:-5.29,cheekZ:-4.98,cornerZ:-3.91,returnZ:-2.12},
  {y:3.51,halfWidth:1.07,frontHalf:.53,cheekHalf:.87,
   frontZ:-5.36,cheekZ:-5.17,cornerZ:-4.35,returnZ:-2.7}
 ]);
 outlet(root,m,'respirator-valve',0,-.15,-5.51,.70);
 if(compact){
  filterPod(root,m.filters,'compact-front-filter',
   [0,1.07,-5.96],[1.23,.77,.88],[0,0,-1]);
 }else for(const s of [-1,1] as const)
  filterPod(root,m.filters,'dual-filter-canister',
   [s*3.14,1.07,-5.31],[1.33,.88,.87],[s*.85,0,-1]);
 simpleHarness(root,m.hardware,'respirator-harness',[1.64,3.03]);
}
