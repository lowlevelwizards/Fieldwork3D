/** Shared low-resolution material library: build textures once, then reuse. */
import * as THREE from 'three';
import {pixelPattern,pixelRepeats,TILE_PIXELS,TILE_WORLD_SIZE,
  type PixelSurface} from './pixel-recipes.ts';
export {PIXEL_SURFACES,TEXELS_PER_OPERATOR,PIXEL_WORLD_SIZE,TILE_WORLD_SIZE}
 from './pixel-recipes.ts';
export type {PixelSurface} from './pixel-recipes.ts';
export const PIXEL_VARIANTS=4;
export class PixelTextureLibrary {
 private textures=new Map<string,THREE.DataTexture>();
 get(kind:PixelSurface,variant=0):THREE.DataTexture{
  const safeVariant=((variant|0)%PIXEL_VARIANTS+PIXEL_VARIANTS)%PIXEL_VARIANTS;
  const key=kind+':'+safeVariant;
  let texture=this.textures.get(key);
  if(texture)return texture;
  texture=new THREE.DataTexture(pixelPattern(kind,safeVariant,TILE_PIXELS),
    TILE_PIXELS,TILE_PIXELS,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.NearestFilter;
  // Mips reduce distant-camera shimmering; source pixels stay integer and crisp.
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;
  texture.needsUpdate=true;
  texture.name='Fieldwork pixel '+key;
  this.textures.set(key,texture);
  return texture;
 }
 get count(){return this.textures.size;}
 dispose(){
  for(const texture of this.textures.values())texture.dispose();
  this.textures.clear();
 }
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
 for(let face=0;face<6;face++){
  const [u,v]=faces[face],start=face*4;
  uv.setXY(start,0,v);uv.setXY(start+1,u,v);
  uv.setXY(start+2,0,0);uv.setXY(start+3,u,0);
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
