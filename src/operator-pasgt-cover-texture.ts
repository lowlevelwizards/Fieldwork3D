/** PASGT P4-B print atlas: physically matched crown/perimeter texel density.
 * The atlas has a continuous side strip and one planar crown region.
 * Only the cloth is affected; clothing/rig/pouch source tiles remain exact.
 */
import * as THREE from 'three';
import {
 HEADWEAR_CAMO_DENSITY,headwearCamoPixels,headwearCamoSize,
 headwearCamoPlacement,type HeadwearCamoId
} from './operator-headwear-camo.ts';
import {
 PASGT_ATLAS_WIDTH,PASGT_ATLAS_HEIGHT,PASGT_CAMO_SCALE,
 PASGT_TOP_SEAM_OFFSETS,PASGT_RING_CIRCUMFERENCE
} from './operator-pasgt-drape-geometry.ts';
const cache=new Map<string,THREE.DataTexture>();
const SOLID_COVER_RGB=[146,150,123] as const;
const mod=(n:number,m:number)=>(n%m+m)%m;
const norm=(v:number)=>Math.max(0,Math.min(255,Math.round(v)));
export function pasgtCoverTexture(camo:HeadwearCamoId|undefined,
 identity:string,roll=0):THREE.DataTexture{
 const placement=camo?headwearCamoPlacement(identity,'pasgt-cover',camo,roll):null;
 const key=camo?[camo,placement!.offsetX,placement!.offsetY].join(':'):'solid-pasgt-cloth';
 const cached=cache.get(key);
 if(cached){cache.delete(key);cache.set(key,cached);return cached;}
 const w=PASGT_ATLAS_WIDTH,h=PASGT_ATLAS_HEIGHT;
 const bytes=new Uint8Array(w*h*4);
 const tile=camo?headwearCamoPixels(camo):undefined,
  tileSize=camo?headwearCamoSize(camo):0,
  density=camo?HEADWEAR_CAMO_DENSITY[camo]*PASGT_CAMO_SCALE:0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const top=y<128;
  // Art is sampled per *world* unit, at the same scale on crown and walls.
  const modelX=top?(x-30)/5-5.275:(x-10)/4.9;
  const modelY=top?(y-30)/5-5.155:(y-145)/5;
  const sampleX=camo?mod(Math.floor(modelX*density)+placement!.offsetX,tileSize):0;
  const sampleY=camo?mod(Math.floor(modelY*density)+placement!.offsetY,tileSize):0;
  const source=(sampleY*tileSize+sampleX)*4,idx=(y*w+x)*4;
  for(let c=0;c<3;c++)
   bytes[idx+c]=camo?tile![source+c]:SOLID_COVER_RGB[c];
  bytes[idx+3]=255;
 }
 const tint=(x:number,y:number,mult:number)=>{
  if(x<0||x>=w||y<0||y>=h)return;
  const idx=(y*w+x)*4;
  for(let c=0;c<3;c++)bytes[idx+c]=norm(bytes[idx+c]*mult);
 };
 // Two offset crown seams: X≈+-2.6 in operator model-space, along the
 // complete 10.3-unit crown from front to back. No center seam.
 for(const offset of PASGT_TOP_SEAM_OFFSETS){
  const x=Math.round(30+5*(offset+5.275));
  for(let y=29;y<=84;y++){
   tint(x,y,.81);
   if((y-29)%6===0)tint(x+1,y,1.08);
  }
 }
 // Their front and rear cloth tails continue down the skirt. These are
 // structural panel joins; model projection remains continuous around sides.
 const frontWidth=10.55,rightDepth=10.325;
 for(const dist of [2.675,7.875,
  frontWidth+rightDepth+2.675,frontWidth+rightDepth+7.875]){
  const x=Math.round(10+4.9*dist);
  for(let y=146;y<=181;y++){
   tint(x,y,.87);
   if(y%7===0)tint(x+1,y,1.06);
  }
 }
 // One stitched hem following every front/ear/nape transition because the
 // geometry maps each point's local bottom to the SAME atlas V=145.
 for(let x=8;x<=Math.round(10+4.9*PASGT_RING_CIRCUMFERENCE);x++){
  tint(x,146,.83);
  if(x%6===0)tint(x,147,1.08);
 }
 const t=new THREE.DataTexture(bytes,w,h,THREE.RGBAFormat,THREE.UnsignedByteType);
 t.channel=1;t.colorSpace=THREE.SRGBColorSpace;
 t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.generateMipmaps=true;
 t.name='PASGT P4 stitched '+key+' x'+PASGT_CAMO_SCALE;
 t.needsUpdate=true;cache.set(key,t);
 // Bounded 256px cloth atlas, one per seed/print; no runtime recolor shader.
 if(cache.size>48){
  const oldest=cache.keys().next().value;
  if(oldest!==undefined){const evict=cache.get(oldest);cache.delete(oldest);evict?.dispose();}
 }
 return t;
}
