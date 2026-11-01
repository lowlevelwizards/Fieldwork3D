/** Deterministic, non-colliding interior fragments concentrated near walls,
 * dirt traps and old equipment. One instanced draw per affected room.
 */
import {seeded,type Site} from '../breach-site.ts';
import {effectiveCondition} from './condition-visual.ts';
export type InteriorFragment={roomId:string;x:number;y:number;size:number;
 kind:'flake'|'dust'|'plaster'|'leaf';angle:number};
export const INTERIOR_FRAGMENT_LIMIT=112;
export function planInteriorFragments(site:Site):InteriorFragment[]{
 const t=effectiveCondition(site)/100;if(t<.38)return [];
 const rng=seeded(site.seed^0x58ca0131),result:InteriorFragment[]=[];
 const reserved=[...site.spawn,...site.enemies,site.objective,site.extract].filter(Boolean);
 for(const room of site.rooms){
  if(result.length>=INTERIOR_FRAGMENT_LIMIT)break;
  const area=room.w*room.h;
  const count=Math.min(18,Math.max(0,Math.floor((t-.34)*area/2350)));
  for(let i=0;i<count&&result.length<INTERIOR_FRAGMENT_LIMIT;i++){
   // Skew to an irregular choice of room borders, not a carpet of fragments.
   const edge=Math.floor(rng()*4),depth=4+rng()*Math.min(36,Math.min(room.w,room.h)*.22);
   const span=.08+.84*rng();
   const x=edge===0?room.x+depth:edge===1?room.x+room.w-depth:
     room.x+span*room.w;
   const y=edge===2?room.y+depth:edge===3?room.y+room.h-depth:
     room.y+span*room.h;
   if(site.cover.some(o=>Math.abs(o.x-x)<o.w/2+2&&Math.abs(o.y-y)<o.h/2+2))continue;
   if(reserved.some(p=>Math.hypot(p.x-x,p.y-y)<18))continue;
   if(site.doors.some(d=>Math.hypot(x-(d.a.x+d.b.x)/2,y-(d.a.y+d.b.y)/2)<24))continue;
   result.push({roomId:room.id,x,y,kind:
     room.purpose==='kitchen'||room.purpose==='bathroom'?'dust':
     site.archetype==='warehouse'?'plaster':i%4===0?'leaf':'flake',
     size:.9+rng()*2.6,angle:rng()*Math.PI*2});
  }
 }
 return result;
}
