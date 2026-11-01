/** Wall-scale deterioration: paint failure, damp streaks and branching cracks.
 * Entire surface ages; stains remain authored by geometry rather than decals.
 */
import type {Site} from '../breach-site.ts';
import {wallPixelSurface} from './pixel-surface-selection.ts';
import {effectiveCondition} from './condition-visual.ts';
import {wallExposure} from './wear-exposure.ts';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function hash(x:number,y:number,seed:number){
 let n=Math.imul(x+Math.imul(seed,29),374761393)^Math.imul(y,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(u:number,v:number,scale:number,seed:number){
 const x=u*scale,y=v*scale,ix=Math.floor(x),iy=Math.floor(y);
 const fx=x-ix,fy=y-iy,tx=fx*fx*(3-2*fx),ty=fy*fy*(3-2*fy);
 const a=hash(ix,iy,seed)*(1-tx)+hash(ix+1,iy,seed)*tx;
 const b=hash(ix,iy+1,seed)*(1-tx)+hash(ix+1,iy+1,seed)*tx;
 return a*(1-ty)+b*ty;
}
/** A fixed 64px map follows a physical wall segment at any width.
 * Top of the image corresponds to upper wall and lower edge to baseboard.
 */
export function conditionWallPixels(site:Site,index:number,
 level=effectiveCondition(site),size=64):Uint8Array{
 const out=new Uint8Array(size*size*4);
 const t=clamp(level/100),s=(site.seed^Math.imul(index+1,65161))>>>0;
 const masonry=['cinderblock','brick','panel'].includes(wallPixelSurface(site.archetype));
 const industrial=['garage','warehouse','utility'].includes(site.archetype??'');
 const color=masonry?[68,62,50]:industrial?[65,63,53]:[79,70,58];
 const crackStart=.27+.16*hash(1,1,s),dripX=.65+.20*hash(2,2,s);
 const wall=site.walls[index],vx=wall.b.x-wall.a.x,vy=wall.b.y-wall.a.y;
 const len2=Math.max(1,vx*vx+vy*vy),mid={x:(wall.a.x+wall.b.x)/2,
   y:(wall.a.y+wall.b.y)/2};
 const exterior=wallExposure(site,index).exterior;
 const wetWall=site.rooms.some(r=>['bathroom','restroom','laundry','utility'].includes(r.purpose??'')&&
   mid.x>=r.x-12&&mid.x<=r.x+r.w+12&&mid.y>=r.y-12&&mid.y<=r.y+r.h+12);
 const windowInfluences=(site.windows??[]).map(w=>{
   const u=clamp(((w.x-wall.a.x)*vx+(w.y-wall.a.y)*vy)/len2);
   const px=wall.a.x+u*vx,py=wall.a.y+u*vy;
   return {u,distance:Math.hypot(px-w.x,py-w.y)};
 }).filter(w=>w.distance<36);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size; // v=0 top, v=1 floor
  const a=noise(u,v,3,s),b=noise(u,v,13,s+47);
  const low=clamp((v-.45)/.55),side=clamp((.12-Math.min(u,1-u))/.12);
  const patches=clamp((a-.37)*2.5)*(.35+.65*b);
  const damp=low*low*(.5+.5*noise(u,v,5,s+19))*((exterior?1.3:.72)+(wetWall?.62:0));
  const windowLeak=windowInfluences.reduce((strongest,w)=>{
   const drift=w.u+.025*Math.sin(v*17+s);
   const horizontal=Math.pow(clamp(1-Math.abs(u-drift)/.085),2);
   const downward=clamp((v-.38)/.34);
   return Math.max(strongest,horizontal*downward*(.65+.35*b));
  },0);
  const streak=Math.pow(clamp(1-Math.abs(u-(dripX+.03*Math.sin(v*13+s)))/.08),2)*
    clamp((v-.15)*1.3)*(.2+.8*b);
  let crack=0;
  if(t>.36){
   const main=crackStart+.08*Math.sin(v*7+s)+.028*Math.sin(v*30+s);
   const branch=main+(v-.53)*.62;
   const primary=Math.abs(u-main)<.017&&v>.17&&v<.87?1:0;
   const secondary=Math.abs(u-branch)<.013&&v>.50&&v<.83?1:0;
   crack=Math.max(primary,secondary)*clamp((t-.36)/.42);
  }
  // Wall seams and damp borders vary per panel; avoid homogeneous blackening.
  let coverage=.12+.36*patches+.30*damp+.18*side+.26*streak+
    (exterior?.26:.12)*windowLeak;
  coverage+=.34*crack;
  if(t>.60)coverage+=.22*clamp((b-.42)*3)*clamp((t-.60)/.4);
  const opacity=Math.min(235,Math.round(255*Math.pow(t,1.45)*clamp(coverage)*1.55));
  const p=(y*size+x)*4;
  const tint=.83+.33*b;
  out[p]=Math.min(255,Math.round(color[0]*tint));
  out[p+1]=Math.min(255,Math.round(color[1]*tint));
  out[p+2]=Math.min(255,Math.round(color[2]*tint));
  out[p+3]=Math.min(245,opacity+Math.round(crack*60*t));
 }
 return out;
}
