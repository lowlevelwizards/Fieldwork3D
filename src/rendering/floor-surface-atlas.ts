/** W7.1: one normalized room mask in the existing opaque floor shader.
 * Base metric UVs, lighting, physical slab and fog ownership remain intact. */
import * as THREE from 'three';
import type {Site,Room} from '../breach-site.ts';
import {conditionFloorPixels} from '../worldgen/condition-visual.ts';
import {indexFloorWear} from '../worldgen/floor-wear-plan.ts';
import type {WearMark} from '../worldgen/environment-wear.ts';
import {buildingTheme,roomFloor} from '../worldgen/building-palettes.ts';
import {rasterFloorWear} from './floor-wear-raster.ts';
import {mapBoxPixelUV} from './pixel-materials.ts';
import {planSurfacePageCounts,uploadSurfacePages} from './surface-atlas-pages.ts';
export const FLOOR_MASK_SIZE=64;
export type FloorMaskSlot={room:Room;texture:THREE.DataTexture;row:number;metricWidth?:number;metricHeight?:number};
export type FloorMaskAtlas={pages:THREE.DataTexture[];slots:Map<string,FloorMaskSlot>};
/** W7 production default; explicit legacy remains the A/B and rollback path. */
export function resolveFloorWear(mode:string|null){return mode!=='legacy';}
export function planFloorMaskPages(count:number):number[]{
 return planSurfacePageCounts(count);
}
export function writeFloorMaskSlot(site:Site,slot:FloorMaskSlot,level:number,marks:readonly WearMark[]=[],boost=1){
 const image=slot.texture.image as {data:Uint8Array};
 const w=slot.metricWidth??FLOOR_MASK_SIZE,h=slot.metricHeight??FLOOR_MASK_SIZE,metric=slot.metricWidth!==undefined,inset=site.programLocked?0:2;
 const bytes=conditionFloorPixels(site,slot.room,level,w,h,metric?inset:0);
 if(level>0){const theme=buildingTheme(site.archetype,site.seed),base=slot.room.kind==='hall'?theme.hall:roomFloor(theme,slot.room.purpose,slot.room.tone);
  rasterFloorWear(bytes,slot.room,site.programLocked?0:2,marks,w,boost,base,h);}
 const stride=slot.texture.image.width;
 if(w===stride)image.data.set(bytes,slot.row*stride*4);
 else for(let y=0;y<h;y++)image.data.set(bytes.subarray(y*w*4,(y+1)*w*4),(slot.row+y)*stride*4);
}
export function buildFloorMaskAtlas(site:Site,level:number,marks:readonly WearMark[]=[],boost=1,metric=false):FloorMaskAtlas{
 const byRoom=indexFloorWear(marks);
 const pages:THREE.DataTexture[]=[],slots=new Map<string,FloorMaskSlot>();
 const buckets=new Map<string,{w:number;h:number;rooms:{room:Room;aw:number;ah:number}[]}>();
 const inset=site.programLocked?0:2,capacity=(n:number)=>Math.min(256,Math.max(64,2**Math.ceil(Math.log2(n))));
 for(const room of site.rooms){
  const aw=metric?Math.max(1,Math.min(256,Math.ceil(room.w-inset))):64,ah=metric?Math.max(1,Math.min(256,Math.ceil(room.h-inset))):64;
  const w=capacity(aw),h=capacity(ah),key=w+':'+h;
  let bucket=buckets.get(key);if(!bucket){bucket={w,h,rooms:[]};buckets.set(key,bucket);}
  bucket.rooms.push({room,aw,ah});
 }
 for(const {w,h,rooms} of buckets.values()){
  let offset=0;
  const max=2048/h;
  const counts=planFloorMaskPages(rooms.length).flatMap(n=>n>max?Array.from({length:n/max},()=>max):[n]);
  for(const count of counts){
   const height=count*h;
   const texture=new THREE.DataTexture(new Uint8Array(w*height*4),w,height);
   texture.colorSpace=THREE.SRGBColorSpace;
   texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearFilter;
   texture.generateMipmaps=false;
   texture.name='w7-floor-mask:'+height;
   for(let i=0;i<count;i++){
    const {room,aw,ah}=rooms[offset+i],slot={room,texture,row:i*h,metricWidth:metric?aw:undefined,metricHeight:metric?ah:undefined};
    slots.set(room.id,slot);writeFloorMaskSlot(site,slot,level,byRoom.get(room.id),boost);
   }
   pages.push(texture);offset+=count;
  }
 }
 uploadSurfacePages(pages);
 return {pages,slots};
}
export function floorMaskGeometry(w:number,h:number,d:number,slot:FloorMaskSlot){
 const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
 const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 const uv=new Float32Array(pos.count*3),height=slot.texture.image.height,width=slot.texture.image.width;
 const aw=slot.metricWidth??FLOOR_MASK_SIZE,ah=slot.metricHeight??FLOOR_MASK_SIZE;
 for(let i=0;i<pos.count;i++){
  // Exact physical slab dimensions; x/z grow with tactical world x/y.
  const x=pos.getX(i)/w+.5,z=pos.getZ(i)/d+.5;
  uv[i*3]=(.5+x*(aw-1))/width;
  uv[i*3+1]=(slot.row+.5+z*(ah-1))/height;
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
