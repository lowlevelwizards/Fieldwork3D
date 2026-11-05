/**
 * D2-F1: fitted, exterior-only voxel garment shell.
 * Same fixed 8x8x8 skull; no new anatomy, hitbox or pose changes.
 * A joined surface replaces dozens of coplanar overlapping box plates.
 * Every aperture is an actual hole through the front surface.
 */
import * as THREE from 'three';
import {unionCuboids,type HeadwearCuboid} from './operator-cuboid-union.ts';
import {CUBE_HEAD_ANATOMY} from './operator-head-anatomy.ts';
export type ClothCuboid=HeadwearCuboid;
export const SKULL=CUBE_HEAD_ANATOMY;
export const CLOTH_SHELL_HALF=4.18;
export const CLOTH_FRONT_Z=-4.19;
export const CLOTH_PIXEL_STEP=.38;
/** Fitted head tube has an exposed front for apertures, not a solid box. */
export function fittedClothHood(name:string):ClothCuboid[]{
 const side=4.15,back=4.14,thick=.35;
 return [
  {name:name+'-crown',x:0,y:7.15,z:0,width:8.30,height:.35,depth:8.30},
  {name:name+'-back',x:0,y:3.03,z:back,width:8.30,height:8.24,depth:thick},
  {name:name+'-left',x:-side,y:3.03,z:0,width:thick,height:8.24,depth:8.30},
  {name:name+'-right',x:side,y:3.03,z:0,width:thick,height:8.24,depth:8.30},
  // Continuous fitted throat extension: not a massive solid collar block.
  {name:name+'-neck-front',x:0,y:-1.77,z:-3.67,width:7.25,height:1.54,depth:.38},
  {name:name+'-neck-back',x:0,y:-1.77,z:3.60,width:7.25,height:1.54,depth:.38},
  {name:name+'-neck-left',x:-3.62,y:-1.77,z:0,width:.39,height:1.54,depth:7.3},
  {name:name+'-neck-right',x:3.62,y:-1.77,z:0,width:.39,height:1.54,depth:7.3},
  {name:name+'-collar-fold',x:0,y:-2.30,z:-3.82,width:7.40,height:.48,depth:.38},
  {name:name+'-collar-fold-back',x:0,y:-2.30,z:3.75,width:7.40,height:.48,depth:.38},
  {name:name+'-collar-fold-left',x:-3.65,y:-2.30,z:0,
   width:.36,height:.48,depth:7.55},
  {name:name+'-collar-fold-right',x:3.65,y:-2.30,z:0,
   width:.36,height:.48,depth:7.55}
 ];
}
/** Each row is a continuous sheet except for its explicitly absent gaps.
 * Interval boundaries form crisp, intentional voxel steps, never painted holes.
 */
export type ClothFrontRow={
 bottom:number;top:number;
 strips:readonly (readonly [number,number])[];
};
export function addClothFrontRows(
 out:ClothCuboid[],prefix:string,rows:readonly ClothFrontRow[]
):void{
 const outer=CLOTH_SHELL_HALF;
 rows.forEach((row,i)=>{
  if(row.top<=row.bottom)throw Error('invalid cloth row '+i);
  for(let j=0;j<row.strips.length;j++){
   const [left,right]=row.strips[j];
   if(left< -outer-.01||right>outer+.01||right<=left)
    throw Error('invalid front cloth interval '+i+':'+j);
   out.push({name:prefix+'-front-'+i+'-'+j,
    x:(left+right)/2,y:(row.bottom+row.top)/2,z:CLOTH_FRONT_Z,
    width:right-left,height:row.top-row.bottom,depth:.38});
  }
 });
}
export function clothExterior(
 name:string,parts:readonly ClothCuboid[],material:THREE.Material
):THREE.Mesh{
 const mesh=new THREE.Mesh(unionCuboids(parts),material);
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.d2ClothExterior=true;
 return mesh;
}
