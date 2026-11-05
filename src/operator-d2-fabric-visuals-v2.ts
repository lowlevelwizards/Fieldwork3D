/**
 * D2-F2: three genuinely fitted balaclava cuts. All use the unchanged
 * 8-unit head, one joined hollow cloth shell and real, stepped face holes.
 * Each exterior piece is joined before rendering: no flat helmet-like box.
 */
import * as THREE from 'three';
import {fittedClothHood,addClothFrontRows,clothExterior,
 type ClothFrontRow} from './operator-d2-fitted-cloth.ts';
import {unionCuboids} from './operator-cuboid-union.ts';
export type D2BalaclavaId='balaclava-one'|'balaclava-three'|'balaclava-open';
type Cut=readonly ClothFrontRow[];
const full=[[-4.18,4.18]] as const;
// Deliberate stepped apertures (not texture-colored rectangles). The one
// opening remains a horizontal visor, the three-hole keeps true small eyes,
// and the open-face cut exposes most of the face from brow to chin.
const one:Cut=[
 {bottom:-1.00,top:3.08,strips:full},
 {bottom:3.08,top:3.34,strips:[[-4.18,-2.72],[2.72,4.18]]},
 {bottom:3.34,top:4.42,strips:[[-4.18,-3.28],[3.28,4.18]]},
 {bottom:4.42,top:4.71,strips:[[-4.18,-2.89],[2.89,4.18]]},
 {bottom:4.71,top:7.30,strips:full}
];
const three:Cut=[
 {bottom:-1.00,top:.97,strips:full},
 {bottom:.97,top:1.18,strips:[[-4.18,-.68],[.68,4.18]]},
 {bottom:1.18,top:1.98,strips:[[-4.18,-1.06],[1.06,4.18]]},
 {bottom:1.98,top:2.17,strips:[[-4.18,-.68],[.68,4.18]]},
 {bottom:2.17,top:3.12,strips:full},
 {bottom:3.12,top:3.32,strips:[[-4.18,-2.75],[-1.55,1.55],[2.75,4.18]]},
 {bottom:3.32,top:4.38,strips:[[-4.18,-3.07],[-1.35,1.35],[3.07,4.18]]},
 {bottom:4.38,top:4.64,strips:[[-4.18,-2.78],[-1.55,1.55],[2.78,4.18]]},
 {bottom:4.64,top:7.30,strips:full}
];
const open:Cut=[
 {bottom:-1.00,top:.10,strips:full},
 {bottom:.10,top:.52,strips:[[-4.18,-2.76],[2.76,4.18]]},
 {bottom:.52,top:5.18,strips:[[-4.18,-3.58],[3.58,4.18]]},
 {bottom:5.18,top:5.60,strips:[[-4.18,-2.95],[2.95,4.18]]},
 {bottom:5.60,top:7.30,strips:full}
];
const cuts:Readonly<Record<D2BalaclavaId,Cut>>={
 'balaclava-one':one,'balaclava-three':three,'balaclava-open':open
};
/** No mesh is made in animation or wear-mode updates. */
export function createD2Balaclava(id:D2BalaclavaId,cloth:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 const parts=fittedClothHood(id);
 addClothFrontRows(parts,id,cuts[id]);
 root.add(clothExterior(id+'-joined-skin',parts,cloth));
 if(id==='balaclava-three'){
  // The eyes-only mode fills just the *real* mouth aperture, not a
  // second family or another overlapping full-face shell.
  const optional=new THREE.Group();
  optional.name='d2-two-hole-mouth-cover';
  optional.userData.d2TwoHoleOption=true;optional.visible=false;
  const fill=new THREE.Mesh(unionCuboids([{
   name:'two-hole-mouth-plug',x:0,y:1.66,z:-4.40,
   width:2.24,height:1.65,depth:.20
  }]),cloth);
  fill.name='two-hole-mouth-plug';fill.castShadow=true;
  optional.add(fill);root.add(optional);
 }
 return root;
}
