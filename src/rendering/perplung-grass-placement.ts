/** Presentation-only placement. The site is never modified. */
import type {Site} from '../breach-site.ts';
import {exteriorZoneRenderLift} from './property-surface-elevation.ts';
import {planPropertySurfaces} from '../worldgen/property-surfaces.ts';
import {planPublicStreet} from '../worldgen/public-street-layout.ts';
export const GRASS_PATCH_SIZE=96,GRASS_MAX_TUFTS=768,GRASS_MAX_PATCHES=48;
export type GrassTuft={x:number;z:number;y:number;width:number;height:number;yaw:number;phase:number;variant:number;tint:number};
export type GrassPatch={key:string;tufts:GrassTuft[]};
type Rect={x:number;y:number;w:number;h:number};
const inside=(x:number,y:number,r:Rect,pad=0)=>Math.abs(x-r.x)<=r.w/2+pad&&Math.abs(y-r.y)<=r.h/2+pad;
const segmentDistance=(x:number,y:number,a:{x:number;y:number},b:{x:number;y:number})=>{
 const dx=b.x-a.x,dy=b.y-a.y;
 const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
};
export function planGrassPatches(site:Site):GrassPatch[]{
 const zones=site.exteriorZones??[];
 const grass=zones.filter(z=>z.kind==='yard'||z.kind==='garden');
 if(!grass.length)return [];
 const excluded:Rect[]=[
  ...zones.filter(z=>z.kind!=='yard'&&z.kind!=='garden'),
  ...site.rooms.map(r=>({x:r.x+r.w/2,y:r.y+r.h/2,w:r.w,h:r.h})),
  ...site.cover,...(site.structures??[]),
  ...planPropertySurfaces(site).map(r=>({x:r.x,y:r.y,w:r.width,h:r.depth}))
 ];
 const street=planPublicStreet(site);
 if(street)excluded.push({x:street.road.x,y:street.road.y,w:street.road.width,h:street.road.depth});
 const segments=[...site.walls,...site.doors];
 const patches=new Map<string,GrassPatch>(),seen=new Set<string>();
 let seed=(site.seed^0x95a31)>>>0,count=0;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const spacing=14;
 // Traverse each finite semantic zone with bounded candidate count. One tuft
 // per jittered cell; overlap handled by highest visible grass zone lift.
 for(const zone of grass){
  const nx=Math.min(96,Math.floor(zone.w/spacing)),nz=Math.min(96,Math.floor(zone.h/spacing));
  for(let j=0;j<nz&&count<GRASS_MAX_TUFTS;j++)for(let i=0;i<nx&&count<GRASS_MAX_TUFTS;i++){
   const x=zone.x-zone.w/2+(i+.5+(rand()-.5)*.55)*spacing;
   const z=zone.y-zone.h/2+(j+.5+(rand()-.5)*.55)*spacing;
   const width=5+rand()*3,height=5+rand()*4,pad=width*.75;
   if(!inside(x,z,zone,-pad)||excluded.some(r=>inside(x,z,r,pad)))continue;
   if(site.bounds&&(x-pad<site.bounds.minX||x+pad>site.bounds.maxX||z-pad<site.bounds.minY||z+pad>site.bounds.maxY))continue;
   if(segments.some(w=>segmentDistance(x,z,w.a,w.b)<pad+3))continue;
   if(site.spawn.some(p=>Math.hypot(x-p.x,z-p.y)<12))continue;
   const cell=Math.floor(x/spacing)+':'+Math.floor(z/spacing);
   if(seen.has(cell))continue;
   const key=Math.floor(x/GRASS_PATCH_SIZE)+':'+Math.floor(z/GRASS_PATCH_SIZE);
   let patch=patches.get(key);
   if(!patch){if(patches.size>=GRASS_MAX_PATCHES)continue;patch={key,tufts:[]};patches.set(key,patch);}
   const lift=Math.max(...grass.filter(r=>inside(x,z,r)).map(r=>exteriorZoneRenderLift(r.id)));
   patch.tufts.push({x,z,y:-1.45+lift+.05,width,height,yaw:rand()*Math.PI*2,
    phase:rand()*Math.PI*6,variant:Math.floor(rand()*4),tint:.88+rand()*.20});
   seen.add(cell);count++;
  }
 }
 return [...patches.values()];
}

/** Preserve every accepted tuft, including deterministic style and placement.
 * Coarser cells trade additional off-camera triangles for fewer draw calls.
 * This does not rerun placement or change the density cap.
 */
export function regroupGrassPatches(patches:readonly GrassPatch[],size=192):GrassPatch[]{
 if(!Number.isFinite(size)||size<GRASS_PATCH_SIZE)throw new RangeError('Invalid grass patch size');
 const grouped=new Map<string,GrassPatch>();
 for(const patch of patches)for(const tuft of patch.tufts){
  const key=Math.floor(tuft.x/size)+':'+Math.floor(tuft.z/size);
  let target=grouped.get(key);
  if(!target){target={key,tufts:[]};grouped.set(key,target);}
  target.tufts.push(tuft);
 }
 return [...grouped.values()];
}
