/** Tiny decorative ground fragments; never create collisions or cover. */
import {seeded,type Site} from '../breach-site.ts';
import {effectiveCondition} from './condition-visual.ts';
export type DebrisKind='stone'|'leaf'|'weed'|'flake';
export type Debris={id:string;kind:DebrisKind;x:number;y:number;size:number;angle:number};
export const DEBRIS_LIMIT=96;
export function planMicroDebris(site:Site):Debris[]{
 const random=seeded(site.seed^0x14d753ac),out:Debris[]=[];
 const continuous=site.conditionLevel!==undefined,t=effectiveCondition(site)/100;
 const neglected=continuous?t>=.60:
   site.condition==='neglected'||site.condition==='vacant';
 for(const zone of site.exteriorZones??[]){
  const count=continuous?Math.min(30,Math.floor(zone.w*zone.h/
      (4000-3400*t))):
    Math.min(24,Math.floor(zone.w*zone.h/(neglected?1200:2300)));
  for(let i=0;i<count&&out.length<DEBRIS_LIMIT;i++){
   const x=zone.x+(random()-.5)*Math.max(0,zone.w-8);
   const y=zone.y+(random()-.5)*Math.max(0,zone.h-8);
   if(site.doors.some(d=>Math.hypot(x-(d.a.x+d.b.x)/2,y-(d.a.y+d.b.y)/2)<13))continue;
   if(site.cover.some(c=>Math.abs(c.x-x)<c.w/2+2&&Math.abs(c.y-y)<c.h/2+2))continue;
   const kind:DebrisKind=zone.kind==='garden'||zone.kind==='yard'?
      random()<.65?'weed':'leaf':zone.kind==='parking'?'stone':
      random()<.7?'stone':'flake';
   out.push({id:zone.id+':debris:'+i,kind,x,y,size:1.4+random()*2.2,angle:random()*6.28318});
  }
 }
 return out;
}
