/** PASGT P6: three independently cut and printed fabric panels.
 * Equal physical texel density, independent print origins. The print can
 * jump at a sewn joint (as real fabric cuts can) without changing pattern
 * size. Two bold, continuous seam lines are pixel-shaded onto the cover.
 */
import * as THREE from 'three';
import {headwearCamoPixels,headwearCamoSize,headwearCamoPlacement,
 type HeadwearCamoId} from './operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY} from './operator-fabric-camo-materials.ts';
import {
 PASGT_ATLAS_WIDTH,PASGT_ATLAS_HEIGHT,PASGT_TOP_SEAM_OFFSETS,
 PASGT_PANEL_CENTER_U,PASGT_FABRIC_PANELS,
 PASGT_UV_TEXELS_PER_UNIT,PASGT_RING_SAMPLES,pasgtRingPoint,
  pasgtFabricCoordinate,
 type PasgtFabricPanel
} from './operator-pasgt-drape-geometry.ts';
const cache=new Map<string,THREE.DataTexture>();
const SOLID_COVER_RGB=[146,150,123] as const;
const mod=(n:number,m:number)=>(n%m+m)%m;
const norm=(v:number)=>Math.max(0,Math.min(255,Math.round(v)));
export const PASGT_FABRIC_DENSITY=FABRIC_CAMO_DENSITY;
export const pasgtCamoWorldPeriod=(id:HeadwearCamoId)=>
 headwearCamoSize(id)/PASGT_FABRIC_DENSITY[id];
/** Separate source-fabric cuts are offset in pattern pixels, not
 * world space. The phase deltas are authored and deterministic.
 */
export const PASGT_PANEL_PRINT_PHASE:Readonly<Record<PasgtFabricPanel,
 readonly [number,number]>>={
 left:[13,-11],top:[0,0],right:[-12,15]
};
export const PASGT_SEAM_HALF_WIDTH_TEXELS=2;
export function pasgtCoverTexture(camo:HeadwearCamoId|undefined,
 identity:string,roll=0):THREE.DataTexture{
 const phase=camo?headwearCamoPlacement(identity,'pasgt-cover',camo,roll):null;
 const key=camo?[camo,phase!.offsetX,phase!.offsetY].join(':'):'pasgt-solid-fabric';
 const existing=cache.get(key);
 if(existing){cache.delete(key);cache.set(key,existing);return existing;}
 const w=PASGT_ATLAS_WIDTH,h=PASGT_ATLAS_HEIGHT,
  bytes=new Uint8Array(w*h*4);
 const master=camo?headwearCamoPixels(camo):undefined,
  size=camo?headwearCamoSize(camo):0,
  density=camo?PASGT_FABRIC_DENSITY[camo]:0;
 const slotX=(panel:PasgtFabricPanel,u:number)=>
  Math.round(PASGT_PANEL_CENTER_U[panel]+PASGT_UV_TEXELS_PER_UNIT*u);
 const slotY=(v:number)=>Math.round(128+PASGT_UV_TEXELS_PER_UNIT*v);
 // Explicitly fill three isolated cloth pattern islands; unused gutters
 // remain transparent and are never used for sampling.
 for(const panel of PASGT_FABRIC_PANELS){
  const center=PASGT_PANEL_CENTER_U[panel],
   [shiftX,shiftY]=PASGT_PANEL_PRINT_PHASE[panel];
  for(let y=0;y<h;y++)for(let x=center-88;x<=center+88;x++){
   const u=(x-center)/PASGT_UV_TEXELS_PER_UNIT,
    v=(y-128)/PASGT_UV_TEXELS_PER_UNIT;
   const mx=camo?mod(Math.floor(u*density)+phase!.offsetX+shiftX,size):0;
   const my=camo?mod(Math.floor(v*density)+phase!.offsetY+shiftY,size):0;
   const source=(my*size+mx)*4,out=(y*w+x)*4;
   for(let channel=0;channel<3;channel++)
    bytes[out+channel]=camo?master![source+channel]:SOLID_COVER_RGB[channel];
   bytes[out+3]=255;
  }
 }
 const tint=(px:number,py:number,mult:number)=>{
  if(px<0||px>=w||py<0||py>=h)return;
  const index=(py*w+px)*4;
  if(bytes[index+3]!==255)return;
  for(let c=0;c<3;c++)bytes[index+c]=norm(bytes[index+c]*mult);
 };
 const seamFront=PASGT_RING_SAMPLES.find(s=>s.side==='front')!;
 const seamBack=PASGT_RING_SAMPLES.find(s=>s.side==='rear')!;
 const frontZ=pasgtRingPoint(seamFront,'top')[2];
 const rearZ=pasgtRingPoint(seamBack,'top')[2];
 // One chunky but flat seam stroke per join, with a subtle offset
 // highlight and stitch dashes. These are color pixels, NOT new polygons.
 // The run goes front-to-back and continues down the upper apron
 // in front and behind, terminating before the elastic band.
 for(const [panel,seams] of [
  ['left',[PASGT_TOP_SEAM_OFFSETS[0]]],
  ['top',PASGT_TOP_SEAM_OFFSETS],
  ['right',[PASGT_TOP_SEAM_OFFSETS[1]]]
 ] as const)
  for(const x of seams){
   // Exactly two physical seams: each is shaded only on its two
   // adjoining cloth cuts. Never paint a ghost seam on a remote panel.
   const at=slotX(panel,x);
   const frontApron=pasgtFabricCoordinate(seamFront,'ramp')[1],
   rearApron=pasgtFabricCoordinate(seamBack,'ramp')[1];
   for(let z=slotY(Math.min(frontZ-1.2,frontApron));
    z<=slotY(Math.max(rearZ+1.2,rearApron));z++){
    for(let dx=-PASGT_SEAM_HALF_WIDTH_TEXELS;
     dx<=PASGT_SEAM_HALF_WIDTH_TEXELS;dx++)
     tint(at+dx,z,Math.abs(dx)===2?.89:.75);
    tint(at+3,z,.96);
    if((z+13)%12<4)tint(at,z,1.18);
   }
  }
 const t=new THREE.DataTexture(bytes,w,h,THREE.RGBAFormat,THREE.UnsignedByteType);
 t.channel=1;t.colorSpace=THREE.SRGBColorSpace;
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
 t.generateMipmaps=true;
 t.name='PASGT three sewn fabric panels '+key;
 t.needsUpdate=true;
 cache.set(key,t);
 if(cache.size>48){
  const oldest=cache.keys().next().value;
  if(oldest!==undefined)cache.delete(oldest);
  // Never dispose a texture while a live operator may still be using it.
 }
 return t;
}
