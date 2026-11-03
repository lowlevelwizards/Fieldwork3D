/** Shared authored camouflage pixels on the actual operator textile geometry.
 * The original 32/64 masters are never recolored, repainted or resampled.
 * Geometry UV coordinates stay in world units (32 reference units per UV).
 * Per-channel textures carry only a deterministic cutting phase and density.
 */
import * as THREE from 'three';
import {headwearCamoPixels,headwearCamoSize,HEADWEAR_CAMO_DENSITY,
 type HeadwearCamoId,type HeadwearCamoPlacement} from './operator-headwear-camo.ts';
import type {FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {mapBoxPixelUV,TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';

const cache=new Map<string,THREE.DataTexture>();
const CAPACITY=256;
export function wardrobeFabricCamoTexture(
 id:HeadwearCamoId,channel:FabricCamoChannel,
 cut:HeadwearCamoPlacement):THREE.DataTexture{
 const size=headwearCamoSize(id);
 const x=((cut.offsetX%size)+size)%size,y=((cut.offsetY%size)+size)%size;
 const key=channel+'|'+id+'|'+x+'|'+y;
 const existing=cache.get(key);
 if(existing){cache.delete(key);cache.set(key,existing);return existing;}
 const texture=new THREE.DataTexture(headwearCamoPixels(id),size,size,
  THREE.RGBAFormat,THREE.UnsignedByteType);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestMipmapNearestFilter;
 texture.generateMipmaps=true;
 // Imported geometry uses 32-world-unit UV repeats. A one-density, 64px
 // print must occupy 64 world units, not shrink to a 32-unit box face.
 const repeat=TILE_WORLD_SIZE*HEADWEAR_CAMO_DENSITY[id]/size;
 texture.repeat.set(repeat,repeat);
 texture.offset.set(x/size,y/size);
 texture.name='Fieldwork cloth '+channel+' / '+id+' / '+x+','+y;
 texture.needsUpdate=true;
 if(cache.size>=CAPACITY)cache.delete(cache.keys().next().value!);
 // Evicted textures are NOT disposed: live rigs may still reference them.
 // Shared materials, not individual meshes, own the stable texture atlas.
 cache.set(key,texture);
 return texture;
}
/** A garment is a series of sewn faces, not six identical tiled stickers.
 * Unwrap a cuboid strip with adjacent front/side/back face offsets and
 * separate lid/base cuts. Preserve metric repeats and existing articulation.
 * The original pixel UVs remain valid for solid and legacy procedural cloth.
 */
export function mapGarmentBoxUV(geometry:THREE.BoxGeometry,
 w:number,h:number,d:number,originX=0,originY=0,originZ=0){
 mapBoxPixelUV(geometry,w,h,d);
 const uv=geometry.getAttribute('uv') as THREE.BufferAttribute;
 const scale=1/TILE_WORLD_SIZE;
 const offsets:readonly (readonly [number,number])[]=[
  [0,0],[d+w,0],[d,h],[d+w,h],[d*2+w,0],[d*2+w*2,0]
 ];
 for(let face=0;face<6;face++){
  const [du,dv]=offsets[face];
  // Offsets compose with the shared cutting phase but do not stretch art.
  const u=(du+originZ+originX*.13)*scale;
  const v=(dv+originY+originX*.21)*scale;
  for(let i=face*4;i<face*4+4;i++)
   uv.setXY(i,uv.getX(i)+u,uv.getY(i)+v);
 }
 uv.needsUpdate=true;
 return geometry;
}
export function garmentBoxUV(geometry:THREE.BoxGeometry,w:number,h:number,d:number,
 material:THREE.Material,x=0,y=0,z=0):THREE.BoxGeometry{
 return material.userData?.fieldworkFabric===true?
  mapGarmentBoxUV(geometry,w,h,d,x,y,z):mapBoxPixelUV(geometry,w,h,d);
}
export function isWardrobeFabricTexture(texture:THREE.Texture|null):boolean{
 return !!texture?.name.startsWith('Fieldwork cloth ');
}
