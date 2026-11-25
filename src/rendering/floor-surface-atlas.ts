/** W7.1: one normalized room mask in the existing opaque floor shader.
 * Base metric UVs, lighting, physical slab and fog ownership remain intact. */
import * as THREE from 'three';
import type {Site,Room} from '../breach-site.ts';
import {conditionFloorPixels} from '../worldgen/condition-visual.ts';
import {indexFloorWear} from '../worldgen/floor-wear-plan.ts';
import type {WearMark} from '../worldgen/environment-wear.ts';
import {rasterFloorWear} from './floor-wear-raster.ts';
import {mapBoxPixelUV} from './pixel-materials.ts';
import {planSurfacePageCounts,uploadSurfacePages} from './surface-atlas-pages.ts';
export const FLOOR_MASK_SIZE=64;
export type FloorMaskSlot={room:Room;texture:THREE.DataTexture;row:number};
export type FloorMaskAtlas={pages:THREE.DataTexture[];slots:Map<string,FloorMaskSlot>};
/** W7 production default; explicit legacy remains the A/B and rollback path. */
export function resolveFloorWear(mode:string|null){return mode!=='legacy';}
export function planFloorMaskPages(count:number):number[]{
 return planSurfacePageCounts(count);
}
export function writeFloorMaskSlot(site:Site,slot:FloorMaskSlot,level:number,marks:readonly WearMark[]=[],boost=1){
 const image=slot.texture.image as {data:Uint8Array};
 const bytes=conditionFloorPixels(site,slot.room,level,FLOOR_MASK_SIZE);
 if(level>0)rasterFloorWear(bytes,slot.room,site.programLocked?0:2,marks,FLOOR_MASK_SIZE,boost);
 image.data.set(bytes,slot.row*FLOOR_MASK_SIZE*4);
}
export function buildFloorMaskAtlas(site:Site,level:number,marks:readonly WearMark[]=[],boost=1):FloorMaskAtlas{
 const byRoom=indexFloorWear(marks);
 const pages:THREE.DataTexture[]=[],slots=new Map<string,FloorMaskSlot>();
 let offset=0;
 for(const count of planFloorMaskPages(site.rooms.length)){
  const height=count*FLOOR_MASK_SIZE;
  const texture=new THREE.DataTexture(new Uint8Array(FLOOR_MASK_SIZE*height*4),FLOOR_MASK_SIZE,height);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=texture.minFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;
  texture.name='w7-floor-mask:'+height;
  for(let i=0;i<count;i++){
   const room=site.rooms[offset+i],slot={room,texture,row:i*FLOOR_MASK_SIZE};
   slots.set(room.id,slot);writeFloorMaskSlot(site,slot,level,byRoom.get(room.id),boost);
  }
  pages.push(texture);offset+=count;
 }
 uploadSurfacePages(pages);
 return {pages,slots};
}
export function floorMaskGeometry(w:number,h:number,d:number,slot:FloorMaskSlot){
 const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
 const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 const uv=new Float32Array(pos.count*3),height=slot.texture.image.height;
 for(let i=0;i<pos.count;i++){
  // Exact physical slab dimensions; x/z grow with tactical world x/y.
  const x=pos.getX(i)/w+.5,z=pos.getZ(i)/d+.5;
  uv[i*3]=(.5+x*(FLOOR_MASK_SIZE-1))/FLOOR_MASK_SIZE;
  uv[i*3+1]=(slot.row+.5+z*(FLOOR_MASK_SIZE-1))/height;
  uv[i*3+2]=normal.getY(i)>.5?1:0;
 }
 geometry.setAttribute('fwFloorMaskUV',new THREE.BufferAttribute(uv,3));
 return geometry;
}
export function floorMaskMaterial(base:THREE.MeshStandardMaterial,texture:THREE.DataTexture){
 const material=base.clone();
 // Cached palette may already have F1 grading from a previous site.
 // clone() does not copy the hook; let normal composition reapply grading.
 delete material.userData.fieldworkR718WorldGraphic;
 material.onBeforeCompile=shader=>{
  shader.uniforms.fwFloorMask={value:texture};
  shader.vertexShader='attribute vec3 fwFloorMaskUV;\nvarying vec3 vFWFloorMaskUV;\n'+
   shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFWFloorMaskUV=fwFloorMaskUV;');
  shader.fragmentShader='uniform sampler2D fwFloorMask;\nvarying vec3 vFWFloorMaskUV;\n'+
   shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec4 fwFloorWear=texture2D(fwFloorMask,vFWFloorMaskUV.xy);\ndiffuseColor.rgb=mix(diffuseColor.rgb,fwFloorWear.rgb,fwFloorWear.a*vFWFloorMaskUV.z);');
 };
 material.customProgramCacheKey=()=> 'w7-floor-mask-v1';
 material.needsUpdate=true;
 return material;
}
