/** Shared low-resolution material library: build textures once, then reuse. */
import * as THREE from 'three';
import {pixelPattern,pixelRepeats,TILE_PIXELS,TILE_WORLD_SIZE,MATERIAL_RECIPE_VERSION,
  type PixelSurface} from './pixel-recipes.ts';
import {readableMipChain} from './texture-lod.ts';
import {materialProfile} from './pixel-profiles.ts';
export {PIXEL_SURFACES,TEXELS_PER_OPERATOR,PIXEL_WORLD_SIZE,TILE_WORLD_SIZE}
 from './pixel-recipes.ts';
export type {PixelSurface} from './pixel-recipes.ts';
export const PIXEL_VARIANTS=4;
export class PixelTextureLibrary {
 private textures=new Map<string,THREE.DataTexture>();
 get(kind:PixelSurface,variant=0):THREE.DataTexture{
  const safeVariant=((variant|0)%PIXEL_VARIANTS+PIXEL_VARIANTS)%PIXEL_VARIANTS;
  const key=MATERIAL_RECIPE_VERSION+':'+kind+':'+safeVariant;
  let texture=this.textures.get(key);
  if(texture)return texture;
  const source=pixelPattern(kind,safeVariant,TILE_PIXELS);
  texture=new THREE.DataTexture(source,
    TILE_PIXELS,TILE_PIXELS,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.mipmaps=readableMipChain(source,TILE_PIXELS,materialProfile(kind).structure);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.NearestFilter;
  // Mips reduce distant-camera shimmering; source pixels stay integer and crisp.
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  // The chain is authored, not driver-averaged into a dark blur.
  texture.generateMipmaps=false;
  texture.needsUpdate=true;
  texture.name='Fieldwork pixel '+key;
  this.textures.set(key,texture);
  return texture;
 }
 get count(){return this.textures.size;}
 /** Conservative RGBA8 storage accounting including the authored mip chain. */
 get estimatedBytes(){
  return [...this.textures.values()].reduce((total,t)=>
   total+(t.mipmaps as {data:Uint8Array}[]).reduce((s,m)=>s+m.data.byteLength,0),0);
 }
 dispose(){
  for(const texture of this.textures.values())texture.dispose();
  this.textures.clear();
 }
}
/** Per-face BoxGeometry vertex ranges, including modest AO subdivisions.
 * The default 1x1 box keeps the historical 4 vertices per face.
 */
export function boxFaceVertexRanges(geometry:THREE.BoxGeometry){
 const {widthSegments=1,heightSegments=1,depthSegments=1}=geometry.parameters;
 const x=(depthSegments+1)*(heightSegments+1);
 const y=(widthSegments+1)*(depthSegments+1);
 const z=(widthSegments+1)*(heightSegments+1);
 let start=0;
 return [x,x,y,y,z,z].map(count=>{
  const range={start,count};start+=count;return range;
 });
}
/** Set physical repeats in geometry (NOT on the shared texture). */
export function mapBoxPixelUV(geometry:THREE.BoxGeometry,w:number,h:number,d:number){
 const uv=geometry.getAttribute('uv') as THREE.BufferAttribute;
 const faces:[[number,number],[number,number],[number,number],
  [number,number],[number,number],[number,number]]=[
   pixelRepeats(d,h),pixelRepeats(d,h),
   pixelRepeats(w,d),pixelRepeats(w,d),
   pixelRepeats(w,h),pixelRepeats(w,h)
  ];
 const ranges=boxFaceVertexRanges(geometry);
 for(let face=0;face<6;face++){
  const [u,v]=faces[face],{start,count}=ranges[face];
  // Default box maps exactly as before; subdivided gear faces interpolate
  // the SAME metric UVs rather than repeating/stretching the camouflage.
  for(let j=start;j<start+count;j++)
   uv.setXY(j,uv.getX(j)*u,uv.getY(j)*v);
 }
 uv.needsUpdate=true;
 return geometry;
}
export function mapPlanePixelUV(geometry:THREE.PlaneGeometry,w:number,d:number,
 x=0,z=0){
 const uv=geometry.getAttribute('uv') as THREE.BufferAttribute;
 const [u,v]=pixelRepeats(w,d);
 // Anchored to world coordinates: adjacent room slabs share pixel seams.
 const u0=(x-w/2)/TILE_WORLD_SIZE,v0=(z-d/2)/TILE_WORLD_SIZE;
 uv.setXY(0,u0,v0);uv.setXY(1,u0+u,v0);
 uv.setXY(2,u0,v0+v);uv.setXY(3,u0+u,v0+v);
 uv.needsUpdate=true;
 return geometry;
}

/** Shared through independently created operator rigs; never disposed per actor. */
export const operatorPixelTextures=new PixelTextureLibrary();
