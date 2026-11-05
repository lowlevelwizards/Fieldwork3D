/** Stage 2C — finalized soft-hat stitching and physical material finishes for the seven approved
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
import {headwearCamoPixels,headwearCamoSize,HEADWEAR_CAMO_DENSITY,type HeadwearCamoId,type HeadwearCamoPlacement} from './operator-headwear-camo.ts';
export type HeadwearMaterialKind='cotton'|'knit'|'composite'|'steel';
export const HEADWEAR_DETAIL_PIXEL_WORLD_SIZE=PIXEL_WORLD_SIZE;
export const HEADWEAR_ATLAS_PIXELS=64;
export const HEADWEAR_REGION_PIXELS=32;
export const HEADWEAR_MATERIAL_KIND:Readonly<Record<HeadSilhouetteId,HeadwearMaterialKind>>={
 'patrol-cap':'cotton','boonie':'cotton','beanie':'knit','beret':'cotton',
 'ach':'composite','high-cut':'composite','pasgt':'composite','soviet-steel':'steel','m1-steel':'steel','ddr-m56':'steel'
};
/** Neutral surface-lighting finish independent of contextual color/camo. */
export type HeadwearSurfaceProfile={
 family:'woven-twill'|'woven-canvas'|'ribbed-knit'|'matte-composite'|'painted-steel';
 roughness:number;metalness:number;
};
export const HEADWEAR_SURFACE_PROFILE:Readonly<Record<HeadSilhouetteId,HeadwearSurfaceProfile>>={
 'patrol-cap':{family:'woven-twill',roughness:.96,metalness:0},
 'boonie':{family:'woven-canvas',roughness:.985,metalness:0},
 'beanie':{family:'ribbed-knit',roughness:.99,metalness:0},
 'beret':{family:'woven-twill',roughness:.995,metalness:0},
 'ach':{family:'matte-composite',roughness:.92,metalness:0},
 'high-cut':{family:'matte-composite',roughness:.91,metalness:0},
 'pasgt':{family:'matte-composite',roughness:.945,metalness:0},
 'soviet-steel':{family:'painted-steel',roughness:.77,metalness:.12},
 'm1-steel':{family:'painted-steel',roughness:.84,metalness:.09},
 'ddr-m56':{family:'painted-steel',roughness:.82,metalness:.08}
};
const textureCache=new Map<HeadSilhouetteId,THREE.DataTexture>();
const finishCache=new Map<HeadSilhouetteId,THREE.DataTexture>();
const camoCache=new Map<string,THREE.DataTexture>();
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
   if(region===0)return u===0&&v===7?244:250; // one quiet panel join
   if(region===1)return 239; // robust sewn band / bill underside
   if(region===2)return v===-6&&Math.abs(u)<=2?239:248; // short bill stitches
   return u===0&&Math.abs(v)<=1?246:251; // short, faint top join
  case 'boonie':
   if(region===0)return u===0&&v===7?244:250; // one quiet panel join
   if(region===1)return 240; // soft cloth band / plain brim underside
   if(region===2){
    // Broken stitch orbit: never a solid groove or hard inset tray.
    const edge=Math.max(Math.abs(u),Math.abs(v));
    const along=Math.abs(u)===5?Math.abs(v):Math.abs(u);
    return edge===5&&along%3===0?236:248;
   }
   return 250; // blank fabric crown roof
  case 'beret':
   // Felted wool, deliberately quiet. Shape comes from the asymmetry.
   return region===1?238:region===2?244:region===3?251:248;
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
  case 'm1-steel':
   return region===1?244:region===2?216:region===3?251:248;
  case 'ddr-m56':
   return region===1?238:region===2?222:region===3?251:248;
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
 texture.name='Fieldwork 2C: '+id+' 1-to-1 material atlas';
 texture.needsUpdate=true;textureCache.set(id,texture);return texture;
}

/** Camo cloth is printed at pattern-specific density, NOT the construction
 * pixel grid. The union's uv1 follows the sewn fabric's top and perimeter.
 * The original 64px UV0 atlas and physical roughness UVs stay untouched.
 * Grayscale construction shading is reserved for solid-color headwear;
 * camouflage pixels are copied exactly, and switching to a solid restores
 * every original 1:1 material feature.
 *
 * Each 64px region samples the chosen 32px or 64px periodic master artwork.
 * Large M81/DCU fields use 1px per world unit even for 64px masters; Tiger, UCP and MultiCam
 * use 2px per world unit. Regions are contextual fabric panels, not new
 * geometry or arbitrary stickers. Pixel filtering is nearest throughout.
 */
export function headwearCamoTexture(id:HeadSilhouetteId,camo:HeadwearCamoId,
 placement:HeadwearCamoPlacement={offsetX:0,offsetY:0}):THREE.DataTexture{
 const tileSize=headwearCamoSize(camo);
 const offsetX=((placement.offsetX%tileSize)+tileSize)%tileSize;
 const offsetY=((placement.offsetY%tileSize)+tileSize)%tileSize;
 const key=id+':'+camo+':'+tileSize+':'+offsetX+':'+offsetY;
 // Refresh the active entry so visible operator textures are not evicted on reroll.
 const existing=camoCache.get(key);
 if(existing){camoCache.delete(key);camoCache.set(key,existing);return existing;}
 const artwork=headwearCamoPixels(camo),density=HEADWEAR_CAMO_DENSITY[camo];
 const px=new Uint8Array(128*128*4);
 for(let region=0;region<4;region++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  // The band/cuff and brim are independently sewn panels, but their print
  // remains equally scaled and does not repeat separately on every box face.
  // Native print density: 1x -> half-speed UV1 sample, 2x -> 1:1,
  // Finnish M05 3x -> 1.5 source pixels per UV1 pixel. The source
  // remains 32px and nearest-neighbor filtering keeps pixel steps crisp.
  let artX=Math.floor(x*density/2);
  const artY=Math.floor(y*density/2);
  if(camo==='tiger-stripe'&&region===1)
   artX+=Math.floor(y/3); // modest diagonal direction on wrapped walls
  const source=((((artY+offsetY)%tileSize)*tileSize+
   ((artX+offsetX)%tileSize))*4);
  // Camo is fabric-dyed artwork, not a grayscale construction decal.
  // The solid-only 64px structural atlas already owns seams and dark joins;
  // multiplying those over the colored print creates unintended black
  // silhouettes and changes the carefully authored camo palette.
  const dest=((Math.floor(region/2)*64+y)*128+(region%2)*64+x)*4;
  for(let n=0;n<3;n++)px[dest+n]=artwork[source+n];
  px[dest+3]=255;
 }
 const tex=new THREE.DataTexture(px,128,128,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.channel=1; // unionCuboids uv1: sewn cloth, not structural 1:1 uv0
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.generateMipmaps=true;
 tex.name='Fieldwork fabric camo '+key+' / '+density+'x 128px sewn-panel atlas';
 tex.needsUpdate=true;camoCache.set(key,tex);
 // Each variation costs ~85 KiB including mipmaps. Keep a bounded LRU
 // rather than retaining thousands of rerolled textures for the whole session.
 // Disposing an idle atlas is safe: poseOperator resolves the current cut
 // on every update and rebinds it if it is needed again.
 const MAX_CACHED_CAMO_CUTS=192;
 if(camoCache.size>MAX_CACHED_CAMO_CUTS){
  const oldest=camoCache.keys().next().value;
  if(oldest!==undefined){
   const evicted=camoCache.get(oldest);
   camoCache.delete(oldest);
   evicted?.dispose();
  }
 }
 return tex;
}

/** Lighting-only roughness atlas, on the SAME 1:1 pixel grid as the
 * neutral construction artwork. Never adds colored marks or new geometry.
 */
export function headwearFinishPixel(id:HeadSilhouetteId,region:0|1|2|3,
 x:number,y:number):number{
 const p=HEADWEAR_SURFACE_PROFILE[id];
 const base=Math.round(p.roughness*255);
 if(p.family==='woven-twill')return base-((x+2*y)%5===0?3:0);
 if(p.family==='woven-canvas')return base-((x+y)%7===0?2:0);
 if(p.family==='ribbed-knit')return base-(region===1&&x%4===0?5:0);
 if(p.family==='painted-steel')return base-(region===2?5:0);
 return base; // composite shell: uniform matte
}
export function headwearFinishTexture(id:HeadSilhouetteId):THREE.DataTexture{
 const cached=finishCache.get(id);if(cached)return cached;
 const pixels=new Uint8Array(HEADWEAR_ATLAS_PIXELS**2*4);
 for(let region=0;region<4;region++)for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const value=headwearFinishPixel(id,region as 0|1|2|3,x,y);
  const i=((Math.floor(region/2)*32+y)*64+(region%2)*32+x)*4;
  pixels[i]=pixels[i+1]=pixels[i+2]=value;
  pixels[i+3]=255;
 }
 const tex=new THREE.DataTexture(pixels,64,64,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.colorSpace=THREE.NoColorSpace; // physical data is linear, not sRGB
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.generateMipmaps=true;
 tex.name='Fieldwork headwear physical finish: '+id;
 tex.needsUpdate=true;finishCache.set(id,tex);return tex;
}
export function createHeadwearDetailMaterial(id:HeadSilhouetteId):THREE.MeshStandardMaterial{
 const finish=HEADWEAR_SURFACE_PROFILE[id];
 const material=new THREE.MeshStandardMaterial({
  // Current neutral preview color; swatches and camo are a later build.
  color:0x899089,map:headwearDetailTexture(id),roughnessMap:headwearFinishTexture(id),
  vertexColors:true,flatShading:true,roughness:1,metalness:finish.metalness
 });
 material.name='Fieldwork '+id+' / '+finish.family;
 material.userData.headwearFinish=finish.family;
 material.userData.pixelWorldSize=HEADWEAR_DETAIL_PIXEL_WORLD_SIZE;
 material.userData.tintAndPatternReady=true;
 return material;
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
 if(id==='beret'){
  if(name.includes('band'))return 1;
  if(name.includes('badge-stiffener'))return 2;
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
 if(id==='m1-steel'){
  if(name.includes('rolled-rim'))return 2;
  if(name.includes('bowl'))return 1;
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
  case 'beret':value=name.includes('band')?.79:
   name.includes('badge-stiffener')?.86:name.includes('drape')?.93:1;break;
  case 'ach':value=name.includes('ear-wrap')?.88:name.includes('nape')?.90:
   name.includes('brow')?.92:1;break;
  case 'high-cut':value=name.includes('nape')?.89:name.includes('brow')?.91:1;break;
  case 'pasgt':value=name.includes('peak')?.84:name.includes('skirt')?.89:
   name.includes('ear-lobe')?.90:1;break;
  case 'soviet-steel':value=name.includes('edge')?.80:name.includes('bowl')?.94:1;break;
  case 'm1-steel':value=name.includes('rolled-rim')?.76:name.includes('bowl')?.94:1;break;
  case 'ddr-m56':value=name.includes('flare')?.83:name.includes('middle')?.92:1;break;
 }
 if(axis===1&&sign===-1&&(name.includes('bill')||name.includes('brim')))
  value*=.89;
 return Math.max(.72,Math.min(1,value));
}
