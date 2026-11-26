/** Continuous, deterministic material aging. Cosmetic only: no tactical geometry. */
import type {Site,Room} from '../breach-site.ts';
import {artCenter,ART_MODULES} from '../rendering/material-art-scale.ts';
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
 // Only intact, functionally relevant sources contribute broad buildup.
 // Local spills and mineral marks are separately anchored by W7.
 const role=room.purpose??room.kind;
 const washable=surface==='tile'||surface==='linoleum';
 const clinical=site.archetype==='clinic';
 const wetSource=new Set(['sink','utility-sink','handwash-station','dish-station','toilet','bathtub','shower','laundry-machine','ice-machine','stove','commercial-range','fryer']);
 const workSource=new Set(['vehicle-lift','compressor','generator','tank','workbench','tool-chest','rack','shelf']);
 const fixtures=site.cover.filter(o=>o.fixture&&!o.destroyed&&!o.toppled&&o.x>=room.x&&o.x<=room.x+room.w&&
   o.y>=room.y&&o.y<=room.y+room.h&&((['bathroom','restroom','half-bath','laundry','utility','kitchen','service','exam','treatment'].includes(role)&&wetSource.has(o.fixture))||(['bay','workshop','maintenance','loading','equipment','storage','packing','control'].includes(role)&&workSource.has(o.fixture))));
 const wet=['bathroom','restroom','laundry','utility','kitchen'].includes(room.purpose??'');
 const industrial=['bay','workshop','maintenance','loading','equipment'].includes(room.purpose??'');
 // Industrial and sanitary finishes age cooler than timber. Broad stain
 // placement still follows real fixtures and room edges, not random dirt.
 const tint=clinical?[100,108,101]:industrial?[64,68,62]:washable?[88,89,81]:wet?[72,73,65]:
  surface==='wood'?[79,67,50]:surface==='carpet'?[72,67,57]:
  (surface==='concrete'||surface==='sealed-concrete')?[71,73,68]:
  [72,70,60];
 // Precompute physical anchors. No per-texel allocation or radial fog.
 const sources=fixtures.map(f=>({x:f.x-room.x,y:f.y-room.y,rx:Math.max(8,Math.min(24,f.w*.65)),ry:Math.max(6,Math.min(16,f.h*.5))}));
 const doors=site.doors.filter(d=>{const x=(d.a.x+d.b.x)/2,y=(d.a.y+d.b.y)/2;return x>=room.x-3&&x<=room.x+room.w+3&&y>=room.y-3&&y<=room.y+room.h+3;}).map(d=>({x:(d.a.x+d.b.x)/2-room.x,y:(d.a.y+d.b.y)/2-room.y}));
 const steps=(value:number)=>value>.74?1:value>.42?.55:value>.20?.24:0;
 const drift=(hash(3,1,s)-.5)*.24;
 const fracture=[.23+drift,.29+drift,.27+drift,.39+drift,.35+drift,.46+drift];
 const joint=(p:number,spacing:number)=>Math.min(((p%spacing)+spacing)%spacing,spacing-((p%spacing)+spacing)%spacing);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const wx=artCenter((x+.5)*room.w/size),wy=artCenter((y+.5)*room.h/size);
  const u=wx/room.w,v=wy/room.h;
  const broad=noise(wx/40,wy/40,1,s),medium=noise(wx/13,wy/13,1,s+17);
  const dEdge=Math.min(wx,room.w-wx,wy,room.h-wy);
  const edgeReach=3+8*t;
  const corner=medium>.54&&dEdge<edgeReach*(.4+.6*broad)?steps((edgeReach-dEdge)/edgeReach):0;
  let source=0;
  for(const f of sources){
   const scale=.55+.45*t;
   const distance=Math.max(Math.abs(wx-f.x)/(f.rx*scale),Math.abs(wy-f.y)/(f.ry*scale));
   source=Math.max(source,steps(1-distance+medium*.12));
  }
  let traffic=0;
  for(const d of doors){
   const dx=room.w/2-d.x,dy=room.h/2-d.y,len=Math.max(1,Math.hypot(dx,dy));
   const along=((wx-d.x)*dx+(wy-d.y)*dy)/len,side=Math.abs((wx-d.x)*dy-(wy-d.y)*dx)/len;
   if(along>=0&&along<=len*.85&&side<4+4*t&&medium>.32)traffic=Math.max(traffic,side<3?.85:.42);
  }
  const patch=steps((broad-(.82-.30*t))*3.1);
  let coverage=(industrial?.05:.015)+.13*patch+.22*corner+.19*source+(surface==='carpet'||surface==='wood'?.18:.08)*traffic;
  if(surface==='tile'&&Math.min(joint(wx,ART_MODULES.tile[0]),joint(wy,ART_MODULES.tile[1]))<.95&&medium>.48)coverage+=.12;
  if(surface==='wood'&&joint(wy,8)<.8&&broad>.48)coverage+=.075;
  if((surface==='concrete'||surface==='sealed-concrete')&&t>.65){
   const f=v*(fracture.length-1),j=Math.min(fracture.length-2,Math.max(0,Math.floor(f)));
   const crack=fracture[j]+(fracture[j+1]-fracture[j])*(f-j);
   if(v<.30+.70*t&&Math.abs((u-crack)*room.w)<.9)coverage+=.23*(t-.65)/.35;
  }
  coverage=clamp(coverage);
  const opacity=Math.round(255*Math.pow(t,1.38)*coverage*(clinical?1.02:washable?1.24:1.55));
  const i=(y*size+x)*4;
  const tone=source>.6||corner>.65?.86:patch>.48?1.02:1.14;
  out[i]=Math.round(tint[0]*tone);
  out[i+1]=Math.round(tint[1]*tone);
  out[i+2]=Math.round(tint[2]*tone);
  out[i+3]=Math.min(232,opacity);
 }
 return out;
}
