/** Stage 2B — true 1:1 hand-authored pixel material for the seven approved
 * silhouettes. All pixel colors are neutral, with independently authored
 * 32x32 construction-region tiles inside one 64x64 atlas per item.
 *
 * Region 0: crown / primary shell
 * Region 1: band / cuff / protective skirt
 * Region 2: brim/bill top or structural lower steel lip
 * Region 3: underside / end grain / alternate top detail
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
const clamp8=(n:number)=>Math.max(0,Math.min(255,Math.round(n)));
const local=(n:number)=>n-16;
/** An authored, sparse shape-aware design, not random noise or edge shimmer.
 * Pixel addresses are local to their region's 32x32 square and align with
 * the approved operator-head coordinate system (-Z forward, +Y upward).
 */
export function headwearRegionPixel(id:HeadSilhouetteId,region:0|1|2|3,
 x:number,y:number):number{
 const u=local(x),v=local(y);
 const textile=HEADWEAR_MATERIAL_KIND[id];
 let shade=252;
 if(textile==='cotton'){
  // Short clustered weave/twill marks. Each cluster spans multiple pixels
  // and is surrounded by quiet cloth so it never becomes surface static.
  if(((x+2*Math.floor(y/4))%9===2)&&y%7>=2&&y%7<=3)shade=223;
  else if(((x+2*Math.floor(y/4))%9===3)&&y%7===2)shade=236;
  if(id==='patrol-cap'){
   if(region===0){
    // One real panel seam, aligned through crown top and side profile.
    if(u===0&&v>=-7&&v<=11)shade=200;
    if(u===1&&v>=-5&&v<=10)shade=236;
   }else if(region===1){
    // Band is distinguishable through material and solid value, not faux
    // bands drawn on top of a fitted ring.
    shade=(x%8>=2&&x%8<=4&&y%6===2)?221:245;
   }else if(region===2){
    // A single bill-top construction line, parallel to front lip.
    shade=(v===-5&&Math.abs(u)<=3)?195:247;
   }else shade=237;
  }else{
   if(region===1)shade=(x%7>=1&&x%7<=3&&y%5===0)?219:245;
   if(region===2){
    // Boonie: one substantial stitch orbit 1 unit inside the wide brim;
    // never the multi-ring scratchwork which previously looked fiddly.
    const ring=Math.max(Math.abs(u),Math.abs(v));
    shade=(ring===6)?202:246;
   }
   if(region===3)shade=235;
  }
 }else if(textile==='knit'){
  if(region===0){
   // Tall broken columns establish a knitted crown, with clear negative
   // space between ribs; no crosshatch and no sweater-fuzz speckles.
   const rib=((x+64)%4);
   shade=rib===0?207:rib===1?231:249;
   if(y%8===1&&rib===0)shade=220;
  }else if(region===1){
   // Folded cuff: wide, regular and slightly higher contrast.
   const rib=((x+64)%3);
   shade=rib===0?189:rib===1?223:249;
  }else{
   // Crown top has no fake vertical stripes painted across its roof.
   shade=(Math.abs(u)<=2&&Math.abs(v)<=2)?231:246;
  }
 }else if(textile==='composite'){
  // Composite stays clean but NOT blank. Large manufacturing-value
  // groups give tonal identity with nothing resembling Velcro/rails.
  if(region===0){
   shade=248;
   if((u>=-3&&u<=0&&v>=2&&v<=4)||
      (u>=2&&u<=4&&v>=-1&&v<=1))shade=223;
   if((u>=-4&&u<=-2&&v>=-4&&v<=-3))shade=236;
  }else if(region===1)shade=(u>=-3&&u<=3&&v>=2&&v<=4)?218:240;
  else if(region===2)shade=(u>=-3&&u<=3&&v>=2&&v<=3)?210:235;
  else shade=237;
  if(id==='pasgt'&&region===2)shade=(v>=1&&v<=4)?205:233;
  if(id==='high-cut'&&region===1&&v>=3)shade=224;
 }else{ // SSh-40: paint over a steel stamping, no rust/insignia/speckle.
  if(region===0)shade=(u>=-3&&u<=2&&v>=2&&v<=4)?222:248;
  else if(region===1)shade=(u>=-5&&u<=1&&v>=1&&v<=3)?221:244;
  else if(region===2)shade=(v>=2&&v<=4)?205:232;
  else shade=226;
 }
 return clamp8(shade);
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
 texture.name='Fieldwork 2B: '+id+' 1-to-1 material atlas';
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
 if(id==='patrol-cap'||id==='boonie'){
  if(name.includes('band'))return 1;
  if(name.includes('bill')||name.includes('brim'))
   return axis===1&&sign===1?2:3;
  return axis===1&&sign===1?3:0;
 }
 if(id==='beanie'){
  if(name.includes('cuff'))return 1;
  return axis===1&&sign===1?3:0;
 }
 if(id==='pasgt'){
  if(name.includes('peak'))return 2;
  if(name.includes('skirt')||name.includes('ear-lobe')||name.includes('temple'))return 1;
  return axis===1&&sign===-1?3:0;
 }
 if(id==='soviet-steel'){
  if(name.includes('edge'))return 2;
  if(name.includes('bowl'))return 1;
  return axis===1&&sign===-1?3:0;
 }
 if(name.includes('nape')||name.includes('temple')||name.includes('wrap'))return 1;
 if(name.includes('brow'))return 2;
 return axis===1&&sign===-1?3:0;
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
