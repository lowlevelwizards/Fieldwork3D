/** Stage 2B.1 — construction-led 1:1 authored pixel material for the seven approved
 * silhouettes. All pixel colors are neutral, with independently authored
 * 32x32 construction-region tiles inside one 64x64 atlas per item.
 *
 * Region 0: crown / primary shell
 * Region 1: band / cuff / protective skirt
 * Region 2: brim/bill top or structural lower steel lip
 * Region 3: quiet top plane (no artificial patches)
 *
 * Each texel corresponds to ONE operator model unit. The atlas projects
 * around the actual cuboid-union exterior; no floating detail planes,
 * unwrapped decal offsets, 1-pixel random speckle or fake accessories.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
export type HeadwearMaterialKind='cotton'|'knit'|'composite'|'steel';
export const HEADWEAR_DETAIL_PIXEL_WORLD_SIZE=PIXEL_WORLD_SIZE;
export const HEADWEAR_ATLAS_PIXELS=64;
export const HEADWEAR_REGION_PIXELS=32;
export const HEADWEAR_MATERIAL_KIND:Readonly<Record<HeadSilhouetteId,HeadwearMaterialKind>>={
 'patrol-cap':'cotton','boonie':'cotton','beanie':'knit',
 'ach':'composite','high-cut':'composite','pasgt':'composite','soviet-steel':'steel'
};
const textureCache=new Map<HeadSilhouetteId,THREE.DataTexture>();
const local=(n:number)=>n-16;
/** An authored, sparse shape-aware design, not random noise or edge shimmer.
 * Pixel addresses are local to their region's 32x32 square and align with
 * the approved operator-head coordinate system (-Z forward, +Y upward).
 */
/** Stage 2B.1: construction-first pixel art. Coordinates are world-model
 * positions projected onto the real surface at exactly one texel per unit.
 * A mark must correspond to a seam, a folded knit rib, one stitch orbit,
 * a material region, or a protective shell edge. No faux patch rectangles.
 */
export function headwearRegionPixel(id:HeadSilhouetteId,region:0|1|2|3,
 x:number,y:number):number{
 const u=local(x),v=local(y);
 switch(id){
  case 'patrol-cap':
   if(region===0){
    // ONE crown panel join, continuing around the four fitted side faces.
    return u===0&&v>=6&&v<=8?220:250;
   }
   if(region===1)return 239; // solid fitted band / shaded bill underside
   if(region===2){
    // A single short seam just inside the FRONT bill lip, not dark tabs.
    return v===-6&&Math.abs(u)<=3?214:248;
   }
   // A center crown-panel seam; roof remains otherwise entirely quiet.
   return u===0&&Math.abs(v)<=3?232:251;
  case 'boonie':
   if(region===0){
    // Fabric crown with one quiet panel join, no repeated side markings.
    return u===0&&v>=6&&v<=8?232:250;
   }
   if(region===1)return 240; // one continuous cloth band / brim underside
   if(region===2){
    // ONE stitch orbit inside the outer 13.45-unit square brim.
    const distance=Math.max(Math.abs(u),Math.abs(v));
    return distance===5?208:248;
   }
   return 250; // crown roof is plain fabric
  case 'beanie':
   if(region===0){
    // Wide, quiet knitted crown ribs; no dense alternating barcode.
    const rib=((u+24)%6);
    return rib===0?233:rib===1?244:250;
   }
   if(region===1){
    // The folded cuff is the focal detail: thicker, spaced knitted ribs.
    const rib=((u+24)%4);
    return rib===0?211:rib===1?234:248;
   }
   return 250; // absolutely no artificial square on crown top
  case 'ach':
   // Matte manufactured shell: shape/edge through vertex colors, not
   // simulated patch/Velcro rectangles on the crown or side.
   return region===1?241:region===2?231:region===3?251:249;
  case 'high-cut':
   // Even quieter than the ACH. Ear relief is actual geometry.
   return region===1?240:region===2?228:region===3?251:249;
  case 'pasgt':
   // Monolithic older shell with distinctly weighty brow and lower skirt.
   return region===1?236:region===2?217:region===3?251:249;
  case 'soviet-steel':
   // Stamped painted bowl: absolutely clean roof, one purposeful dark rim.
   return region===1?245:region===2?221:region===3?251:249;
 }
}
/** Compatibility accepts material names for older tests/tools. Runtime
 * uses individual item IDs to retain distinct construction markings.
 */
export function headwearDetailPixels(kindOrId:HeadwearMaterialKind|HeadSilhouetteId):Uint8Array{
 const id:HeadSilhouetteId=kindOrId==='cotton'?'patrol-cap':
  kindOrId==='knit'?'beanie':kindOrId==='composite'?'ach':
  kindOrId==='steel'?'soviet-steel':kindOrId;
 const pixels=new Uint8Array(HEADWEAR_ATLAS_PIXELS*HEADWEAR_ATLAS_PIXELS*4);
 for(let region=0;region<4;region++)for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const tone=headwearRegionPixel(id,region as 0|1|2|3,x,y);
  const ix=(Math.floor(region/2)*32+y)*64+(region%2)*32+x;
  const i=ix*4;pixels[i]=tone;pixels[i+1]=tone;pixels[i+2]=tone;pixels[i+3]=255;
 }
 return pixels;
}
export function headwearDetailTexture(id:HeadSilhouetteId):THREE.DataTexture{
 const cached=textureCache.get(id);if(cached)return cached;
 const texture=new THREE.DataTexture(headwearDetailPixels(id),64,64,
  THREE.RGBAFormat,THREE.UnsignedByteType);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestMipmapNearestFilter;
 texture.generateMipmaps=true;
 texture.name='Fieldwork 2B.1: '+id+' 1-to-1 material atlas';
 texture.needsUpdate=true;textureCache.set(id,texture);return texture;
}
export function createHeadwearDetailMaterial(id:HeadSilhouetteId):THREE.MeshStandardMaterial{
 const kind=HEADWEAR_MATERIAL_KIND[id];
 return new THREE.MeshStandardMaterial({
  color:0x899089,map:headwearDetailTexture(id),
  vertexColors:true,flatShading:true,
  roughness:kind==='cotton'||kind==='knit'?.98:kind==='steel'?.79:.93,
  metalness:kind==='steel'?.12:0
 });
}
/** Structural material region, selected from the actual OUTER cuboid face.
 * No geometry is added. Face orientation ensures underside marks do not
 * leak onto brim tops, crown tops or other parts.
 */
export function headwearFaceRegion(id:HeadSilhouetteId,name:string,
 axis:number,sign:number):0|1|2|3{
 // Region 3 always means the bare, quiet top, never an underside decal.
 // Region 2 always means a real construction lip/brow or a brim TOP.
 if(id==='patrol-cap'||id==='boonie'){
  if(name.includes('band'))return 1;
  if(name.includes('bill')||name.includes('brim'))
   return axis===1&&sign===1?2:1;
  return axis===1&&sign===1?3:0;
 }
 if(id==='beanie'){
  if(name.includes('cuff'))return 1;
  return axis===1&&sign===1?3:0;
 }
 if(id==='pasgt'){
  if(name.includes('peak'))return 2;
  if(name.includes('skirt')||name.includes('ear-lobe')||name.includes('temple'))return 1;
  return axis===1&&sign===1?3:0;
 }
 if(id==='soviet-steel'){
  if(name.includes('edge'))return 2;
  if(name.includes('bowl'))return 1;
  return axis===1&&sign===1?3:0;
 }
 if(name.includes('nape')||name.includes('temple')||name.includes('wrap'))return 1;
 if(name.includes('brow'))return 2;
 return axis===1&&sign===1?3:0;
}
/** Large intentional vertex-color hierarchy. Texture values add material
 * identity; this adds no triangles, new bands or decorative rails. */
export function headwearFaceTone(id:HeadSilhouetteId,name:string,
 axis:number,sign:number):number{
 let value=1;
 switch(id){
  case 'patrol-cap':value=name.includes('band')?.81:name.includes('bill')?.88:1;break;
  case 'boonie':value=name.includes('band')?.83:name.includes('brim')?.94:1;break;
  case 'beanie':value=name.includes('cuff')?.81:1;break;
  case 'ach':value=name.includes('ear-wrap')?.88:name.includes('nape')?.90:
   name.includes('brow')?.92:1;break;
  case 'high-cut':value=name.includes('nape')?.89:name.includes('brow')?.91:1;break;
  case 'pasgt':value=name.includes('peak')?.84:name.includes('skirt')?.89:
   name.includes('ear-lobe')?.90:1;break;
  case 'soviet-steel':value=name.includes('edge')?.80:name.includes('bowl')?.94:1;break;
 }
 if(axis===1&&sign===-1&&(name.includes('bill')||name.includes('brim')))
  value*=.89;
 return Math.max(.72,Math.min(1,value));
}
