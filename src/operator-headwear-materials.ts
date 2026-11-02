/** Stage 2A: large-scale readable headwear materials.
 *
 * SHAPE comes from the exact approved unioned cuboids. Face-tone boundaries
 * express real constructed regions without overlay polygons. Neutral RGB
 * texture values multiply future colors/camouflage rather than baking dyes.
 *
 * No stamps, logos, rails, stitches or faux seams below the 1.25-unit
 * operator pixel. Construction seams are region boundaries in geometry.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE,TILE_PIXELS} from './rendering/pixel-recipes.ts';
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
export type HeadwearMaterialKind='cotton'|'knit'|'composite'|'steel';
export const HEADWEAR_DETAIL_PIXEL_WORLD_SIZE=PIXEL_WORLD_SIZE;
export const HEADWEAR_MATERIAL_KIND:Readonly<Record<HeadSilhouetteId,HeadwearMaterialKind>>={
 'patrol-cap':'cotton','boonie':'cotton','beanie':'knit',
 'ach':'composite','high-cut':'composite','pasgt':'composite',
 'soviet-steel':'steel'
};
const textureCache=new Map<HeadwearMaterialKind,THREE.DataTexture>();
export function headwearDetailPixels(kind:HeadwearMaterialKind):Uint8Array{
 const data=new Uint8Array(TILE_PIXELS*TILE_PIXELS*4);
 for(let y=0;y<TILE_PIXELS;y++)for(let x=0;x<TILE_PIXELS;x++){
  let gray=255;
  switch(kind){
   case 'cotton':
    // Two isolated broken yarn strokes per tile, not speckle noise.
    if((y===7&&x>=11&&x<=12)||(y===23&&x>=25&&x<=26))
     gray=249;
    break;
   case 'knit':
    // Low-contrast interrupted upright columns: knitted, not striped.
    if(x%5===2&&y%9>=2&&y%9<=5)gray=247;
    break;
   case 'composite':
    // Nearly smooth painted polymer; two very faint manufacturing marks.
    if((x===9&&y===13)||(x===10&&y===13)||
       (x===27&&y===29))gray=250;
    break;
   case 'steel':
    // Painted stamped steel, with no fake grid, speckling or wear pass.
    if(x===20&&y===23)gray=251;
    break;
  }
  const i=(y*TILE_PIXELS+x)*4;
  data.set([gray,gray,gray,255],i);
 }
 return data;
}
export function headwearDetailTexture(kind:HeadwearMaterialKind):THREE.DataTexture{
 const cached=textureCache.get(kind);if(cached)return cached;
 const tex=new THREE.DataTexture(headwearDetailPixels(kind),
  TILE_PIXELS,TILE_PIXELS,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.generateMipmaps=true;
 tex.name='fieldwork-headwear-neutral-'+kind;
 tex.needsUpdate=true;textureCache.set(kind,tex);return tex;
}
export function createHeadwearDetailMaterial(id:HeadSilhouetteId):THREE.MeshStandardMaterial{
 const kind=HEADWEAR_MATERIAL_KIND[id];
 return new THREE.MeshStandardMaterial({
  color:0x899089,map:headwearDetailTexture(kind),
  vertexColors:true,flatShading:true,roughness:kind==='steel'?.88:.97,
  metalness:kind==='steel'?.08:0
 });
}
/** A deliberate region-value hierarchy with NO extra meshes.
 * Source cuboid names are the exact approved geometry authorship names.
 * Side and underside lighting remains physically shaded by the renderer.
 */
export function headwearFaceTone(id:HeadSilhouetteId,name:string,
 axis:number,sign:number):number{
 let value=1;
 switch(id){
  case 'patrol-cap':
   value=name.includes('band')?.86:name.includes('bill')?.91:1;break;
  case 'boonie':
   value=name.includes('band')?.87:name.includes('brim')?.92:1;break;
  case 'beanie':
   value=name.includes('cuff')?.83:1;break;
  case 'ach':
   value=name.includes('ear-wrap')?.91:name.includes('nape')?.94:
    name.includes('brow')?.95:1;break;
  case 'high-cut':
   value=name.includes('nape')?.94:name.includes('brow')?.95:1;break;
  case 'pasgt':
   value=name.includes('peak')?.91:name.includes('skirt')?.92:
    name.includes('ear-lobe')?.93:1;break;
  case 'soviet-steel':
   value=name.includes('edge')?.86:name.includes('bowl')?.96:1;break;
 }
 // Brim undersides and bill undersides are a broad shadow region, not a
 // one-pixel painted line or separate decal.
 if(axis===1&&sign===-1&&(name.includes('bill')||name.includes('brim')))
  value*=.91;
 return Math.max(.72,Math.min(1,value));
}
