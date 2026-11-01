/** Directional exposure inferred from real room enclosures, without fake weather. */
import {seeded,type Site} from '../breach-site.ts';
import type {ObjectWear} from './object-wear.ts';
import {wallPixelSurface,fixturePixelSurface} from './pixel-surface-selection.ts';
import {canWear} from './material-properties.ts';
import {effectiveCondition} from './condition-visual.ts';
export type Exposure={exterior:boolean;sheltered:boolean;side:-1|1};
export function wallExposure(site:Site,index:number):Exposure{
 const w=site.walls[index],mx=(w.a.x+w.b.x)/2,my=(w.a.y+w.b.y)/2;
 const length=Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y)||1;
 const nx=-(w.b.y-w.a.y)/length,ny=(w.b.x-w.a.x)/length;
 const inside=(x:number,y:number)=>site.rooms.some(r=>
  x>r.x+1&&x<r.x+r.w-1&&y>r.y+1&&y<r.y+r.h-1);
 const left=inside(mx+nx*9,my+ny*9);
 const right=inside(mx-nx*9,my-ny*9);
 return {exterior:left!==right,sheltered:left&&right,side:left?-1:1};
}
export function planExposureWear(site:Site):ObjectWear[]{
 const continuous=site.conditionLevel!==undefined,t=effectiveCondition(site)/100;
 if(continuous?t<.50:!['neglected','vacant','disturbed'].includes(site.condition??''))return [];
 const rng=seeded(site.seed^0x5c1dc018),out:ObjectWear[]=[];
 const maxWalls=continuous?Math.min(16,Math.round(t*17)):8;
 const maxAll=continuous?Math.min(24,Math.round(t*25)):11;
 const material=wallPixelSurface(site.archetype);
 for(let i=0;i<site.walls.length&&out.length<maxWalls;i++){
  const exposure=wallExposure(site,i);
  if(!exposure.exterior||rng()>(continuous?.12+.67*t:.26))continue;
  const kind=canWear(material,'moss')?'moss':canWear(material,'drip')?'drip':'scuff';
  out.push({id:'exposure:wall:'+i,owner:'wall',index:i,kind,
   u:.2+rng()*.6,v:.36+rng()*.4,size:10+rng()*12,
   opacity:continuous?.15+.35*t:.32,
   face:exposure.side===1?'front':'back'});
 }
 for(let i=0;i<site.cover.length&&out.length<maxAll;i++){
  const o=site.cover[i];if(!o.fixture)continue;
  const outside=!site.rooms.some(r=>o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h);
  if(!outside||rng()>(continuous?.08+.73*t:.35))continue;
  const surface=fixturePixelSurface(o.fixture);
  if(!canWear(surface,'rust'))continue;
  out.push({id:'exposure:fixture:'+i,owner:'fixture',index:i,kind:'rust',
   u:.14+rng()*.65,v:.15+rng()*.4,size:8+rng()*9,
   opacity:continuous?.15+.35*t:.31});
 }
 return out;
}
