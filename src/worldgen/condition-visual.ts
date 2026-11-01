/** Continuous, deterministic material aging. Cosmetic only: no tactical geometry. */
import type {Site,Room} from '../breach-site.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function effectiveCondition(site:Site):number{
 if(Number.isFinite(site.conditionLevel))
   return Math.max(0,Math.min(100,Math.round(site.conditionLevel!)));
 const base={occupied:14,busy:36,neglected:77,vacant:68,
   renovation:48,disturbed:64}[site.condition??'occupied'];
 const era=site.identity?.era==='older'?7:site.identity?.era==='recent'?-5:0;
 const upkeep=site.identity?.upkeep==='neglected'?9:
   site.identity?.upkeep==='meticulous'?-7:0;
 return Math.max(0,Math.min(100,base+era+upkeep+((site.seed>>>4)%13)-6));
}
const hash=(x:number,y:number,s:number)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
};
function noise(x:number,y:number,scale:number,s:number){
 const ax=Math.floor(x*scale),ay=Math.floor(y*scale);
 const dx=x*scale-ax,dy=y*scale-ay;
 const tx=dx*dx*(3-2*dx),ty=dy*dy*(3-2*dy);
 const a=hash(ax,ay,s)*(1-tx)+hash(ax+1,ay,s)*tx;
 const b=hash(ax,ay+1,s)*(1-tx)+hash(ax+1,ay+1,s)*tx;
 return a*(1-ty)+b*ty;
}
/** One 64x64 translucent, spatially varied tint for an entire floor.
 * Broad aging is always present at high condition levels, even without decals.
 * Coordinates and fixture locations determine accumulations, not symmetry.
 */
export function conditionFloorPixels(site:Site,room:Room,level=effectiveCondition(site),size=64):Uint8Array{
 const surface=roomPixelSurface(site.archetype,room.purpose??room.kind);
 const out=new Uint8Array(size*size*4);
 const t=clamp(level/100),s=(site.seed^(room.x*113|0)^(room.y*271|0))>>>0;
 const fixtures=site.cover.filter(o=>o.fixture&&o.x>=room.x&&o.x<=room.x+room.w&&
   o.y>=room.y&&o.y<=room.y+room.h);
 const wet=['bathroom','restroom','laundry','utility','kitchen'].includes(room.purpose??'');
 const industrial=['bay','workshop','maintenance','loading','equipment'].includes(room.purpose??'');
 const tint=industrial?[58,51,42]:wet?[69,65,52]:
  surface==='wood'?[75,66,47]:surface==='carpet'?[70,62,49]:[70,66,54];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size;
  const edge=clamp((.22-Math.min(u,1-u,v,1-v))/.22);
  const corner=Math.pow(edge,2)*(0.4+0.6*noise(u,v,4,s+4));
  const broad=noise(u,v,3,s),medium=noise(u,v,11,s+17);
  const fine=hash(x,y,s+79);
  const asym=.5*(1-u)+.5*v;
  let source=0;
  for(const f of fixtures){
   const fx=(f.x-room.x)/room.w,fy=(f.y-room.y)/room.h;
   const distance=Math.hypot((u-fx)*room.w,(v-fy)*room.h);
   const radius=wet?46:industrial?64:29;
   source=Math.max(source,Math.pow(clamp(1-distance/radius),2));
  }
  // Favor coherent color regions, edge accumulation, and intermittent
  // source stains. Keep dark channels strong enough at tactical zoom.
  const patches=clamp((broad-.38)*2.2)*(.35+.65*medium);
  const coverage=clamp(.14+.32*patches+.32*corner+.22*source+
    .14*asym*(medium>.48?1:.2)+.08*(fine-.5));
  const opacity=Math.round(255*Math.pow(t,1.38)*coverage*1.55);
  const i=(y*size+x)*4;
  out[i]=Math.round(tint[0]*(.85+.26*medium));
  out[i+1]=Math.round(tint[1]*(.83+.30*medium));
  out[i+2]=Math.round(tint[2]*(.86+.24*medium));
  out[i+3]=Math.min(232,opacity);
 }
 return out;
}
