/** PASGT P5-B: one unfolded metric fabric atlas.
 * Cloth pattern scale is sourced directly from approved garment/rig textures.
 * Crown, brow bridge, and ear/nape skirt all sample the same physical UV
 * coordinates. No arbitrary helmet zoom multiplier or separate panel reset.
 */
import * as THREE from 'three';
import {headwearCamoPixels,headwearCamoSize,headwearCamoPlacement,
 type HeadwearCamoId} from './operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY} from './operator-fabric-camo-materials.ts';
import {
 PASGT_ATLAS_WIDTH,PASGT_ATLAS_HEIGHT,PASGT_TOP_SEAM_OFFSETS,
 PASGT_UV_TEXELS_PER_UNIT,PASGT_RING_SAMPLES,pasgtRingPoint
} from './operator-pasgt-drape-geometry.ts';
const cache=new Map<string,THREE.DataTexture>();
const SOLID_COVER_RGB=[146,150,123] as const;
const mod=(n:number,m:number)=>(n%m+m)%m;
const norm=(v:number)=>Math.max(0,Math.min(255,Math.round(v)));
export const PASGT_FABRIC_DENSITY=FABRIC_CAMO_DENSITY;
/** Authoritative world-unit art density is shared with garments, not tuned
 * independently from a convenient close-up helmet screenshot.
 */
export const pasgtCamoWorldPeriod=(id:HeadwearCamoId)=>
 headwearCamoSize(id)/PASGT_FABRIC_DENSITY[id];
export function pasgtCoverTexture(camo:HeadwearCamoId|undefined,
 identity:string,roll=0):THREE.DataTexture{
 const phase=camo?headwearCamoPlacement(identity,'pasgt-cover',camo,roll):null;
 const key=camo?[camo,phase!.offsetX,phase!.offsetY].join(':'):'pasgt-solid-fabric';
 const existing=cache.get(key);
 if(existing){cache.delete(key);cache.set(key,existing);return existing;}
 const w=PASGT_ATLAS_WIDTH,h=PASGT_ATLAS_HEIGHT,bytes=new Uint8Array(w*h*4);
 const master=camo?headwearCamoPixels(camo):undefined,
  size=camo?headwearCamoSize(camo):0,
  density=camo?PASGT_FABRIC_DENSITY[camo]:0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=(x-128)/PASGT_UV_TEXELS_PER_UNIT;
  const v=(y-128)/PASGT_UV_TEXELS_PER_UNIT;
  const mx=camo?mod(Math.floor(u*density)+phase!.offsetX,size):0;
  const my=camo?mod(Math.floor(v*density)+phase!.offsetY,size):0;
  const source=(my*size+mx)*4,out=(y*w+x)*4;
  for(let channel=0;channel<3;channel++)
   bytes[out+channel]=camo?master![source+channel]:SOLID_COVER_RGB[channel];
  bytes[out+3]=255;
 }
 const tint=(px:number,py:number,mult:number)=>{
  if(px<0||px>=w||py<0||py>=h)return;
  const index=(py*w+px)*4;
  for(let c=0;c<3;c++)bytes[index+c]=norm(bytes[index+c]*mult);
 };
 const px=(model:number)=>Math.round(128+PASGT_UV_TEXELS_PER_UNIT*model);
 const first=PASGT_RING_SAMPLES.find(s=>s.side==='front')!;
 const back=PASGT_RING_SAMPLES.find(s=>s.side==='rear')!;
 const frontZ=pasgtRingPoint(first,'top')[2];
 const rearZ=pasgtRingPoint(back,'top')[2];
 // Three sewn fabric panels, two longitudinal seams only. Continue them
 // a short distance onto the front/rear: never manufacture tall machined
 // grooves down the entire protective skirt.
 for(const x of PASGT_TOP_SEAM_OFFSETS){
  const u=px(x);
  for(let y=px(frontZ-.70);y<=px(rearZ+.70);y++){
   tint(u,y,.91);
   // A single occasional stitch shade is enough, not a row of bright rivets.
   if((y+37)%13===0)tint(u+1,y,.98);
  }
 }
 const t=new THREE.DataTexture(bytes,w,h,THREE.RGBAFormat,THREE.UnsignedByteType);
 t.channel=1;t.colorSpace=THREE.SRGBColorSpace;
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
 t.generateMipmaps=true;
 t.name='PASGT sewn metric fabric '+key+
  (camo?' / '+PASGT_FABRIC_DENSITY[camo]+' native px per unit':'');
 t.needsUpdate=true;
 cache.set(key,t);
 if(cache.size>64){
  const oldest=cache.keys().next().value;
  if(oldest!==undefined)cache.delete(oldest);
  // Do not dispose an evicted texture: a live operator may still use it.
 }
 return t;
}
