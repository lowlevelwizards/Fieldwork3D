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

/** R9 metric textile pattern scale. Master pixels and approved headwear
 * crown density stay unchanged. 64px organic masters were spanning as much
 * as 64 world units, so the torso appeared to have one enormous color field.
 * All 3D garment, armor, rig, and pack channels share these repeat factors.
 */
export const FABRIC_CAMO_DENSITY:Readonly<Record<HeadwearCamoId,number>>={
 ...HEADWEAR_CAMO_DENSITY,
 'm81-woodland':3.0,      // 21.3 world units per complete 64px print
 'woodland-dpm':1.85,     // 17.3 units, retains large recognizable strokes
 'scorpion-w2':3.0,       // 21.3 units
 'british-mtp':2.85,      // 22.5 units
 'three-color-desert':1.45,
 'six-color-desert':1.50,
 'swedish-m90':1.40,
 alpenflage:1.45,
 'russian-flora':1.50,
 'rhodesian-brushstroke':1.25,
 'belgian-jigsaw':2.60,
 'australian-dpcu':2.45,
 'italian-vegetato':2.55,
 'splittertarn-31':2.35,
 'atacs-fg':2.8,'ukrainian-mm14':3.1,aor2:4.0,'multicam-tropic':4.0,
 'atacs-au':2.8,'ss-leto':2.5,aor1:4.0,'multicam-arid':4.0
};
export function fabricCamoWorldPeriod(id:HeadwearCamoId):number{
 return headwearCamoSize(id)/FABRIC_CAMO_DENSITY[id];
}
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
 // UVs remain metric (32 world units = 1 UV). Texture repeats, rather
 // than individually scaled mesh vertices, preserve texel size across cuts.
 const repeat=TILE_WORLD_SIZE*FABRIC_CAMO_DENSITY[id]/size;
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
