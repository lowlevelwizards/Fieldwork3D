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
const one:Cut=[
 {bottom:-1.00,top:3.05,strips:full},
 {bottom:3.05,top:3.43,strips:[[-4.18,-2.62],[2.62,4.18]]},
 {bottom:3.43,top:4.50,strips:[[-4.18,-3.02],[3.02,4.18]]},
 {bottom:4.50,top:4.92,strips:[[-4.18,-2.66],[2.66,4.18]]},
 {bottom:4.92,top:7.30,strips:full}
];
const three:Cut=[
 {bottom:-1.00,top:.84,strips:full},
 {bottom:.84,top:1.08,strips:[[-4.18,-.82],[.82,4.18]]},
 {bottom:1.08,top:2.20,strips:[[-4.18,-1.08],[1.08,4.18]]},
 {bottom:2.20,top:2.48,strips:[[-4.18,-.88],[.88,4.18]]},
 {bottom:2.48,top:3.02,strips:full},
 {bottom:3.02,top:3.38,strips:[[-4.18,-2.78],[-1.22,1.22],[2.78,4.18]]},
 {bottom:3.38,top:4.46,strips:[[-4.18,-2.94],[-1.04,1.04],[2.94,4.18]]},
 {bottom:4.46,top:4.88,strips:[[-4.18,-2.76],[-1.20,1.20],[2.76,4.18]]},
 {bottom:4.88,top:7.30,strips:full}
];
const open:Cut=[
 {bottom:-1.00,top:.25,strips:full},
 {bottom:.25,top:.75,strips:[[-4.18,-2.85],[2.85,4.18]]},
 {bottom:.75,top:5.18,strips:[[-4.18,-3.42],[3.42,4.18]]},
 {bottom:5.18,top:5.62,strips:[[-4.18,-2.98],[2.98,4.18]]},
 {bottom:5.62,top:7.30,strips:full}
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
