/** Localized visual wear. A condition describes a property, not a full-surface filter.
 * These are render-only decals with a small whole-site budget. */
import {seeded,type Site} from '../breach-site.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';
import {surfaceMood} from './surface-moods.ts';
import type {WearTextureKind} from '../rendering/pixel-decals.ts';
export type WearKind=WearTextureKind;
export type WearMark={
 id:string;roomId:string;kind:WearKind;x:number;y:number;
 width:number;depth:number;rotation:number;opacity:number;
};
export const WEAR_BUDGET:Record<NonNullable<Site['condition']>,number>={
 occupied:2,busy:3,neglected:5,vacant:3,renovation:5,disturbed:6,
};
export function planEnvironmentalWear(site:Site):WearMark[]{
 const mood=surfaceMood(site.archetype);
 const budget=Math.min(WEAR_BUDGET[site.condition??'occupied'],
   Math.ceil(WEAR_BUDGET[site.condition??'occupied']*mood.wearFraction));
 if(budget===0)return [];
 const random=seeded(site.seed^0x66ee4a12);
 const rooms=site.rooms.filter(r=>r.w>=40&&r.h>=40);
 if(!rooms.length)return [];
 const marks:WearMark[]=[];
 for(let i=0;i<budget;i++){
  // Distribute marks across a site rather than multiplying per room.
  const room=rooms[Math.floor(random()*rooms.length)];
  const surface=roomPixelSurface(site.archetype,room.purpose??room.kind);
  // Activity and material determine the mark. A garage accumulates oil near
  // machinery, a kitchen grease, a utility sink mineral buildup and traffic
  // routes scuffs; condition only modifies the frequency and severity.
  const role=room.purpose??room.kind;
  const industrial=['bay','workshop','equipment','maintenance','control'].includes(role);
  const wet=['bathroom','restroom','utility','laundry'].includes(role);
  const cooking=['kitchen','pantry'].includes(role);
  let kind:WearKind;
  if(site.condition==='renovation')kind=i%2===0?'scrape':'dust';
  else if(site.condition==='vacant')kind=i%2===0?'dust':'fade';
  else if(site.condition==='disturbed')kind=i%3===0?'scratch':'scuff';
  else if(industrial)kind=i%3===0?'oil':i%3===1?'grease':'rust';
  else if(cooking)kind=i%2===0?'grease':'scuff';
  else if(wet)kind=i%2===0?'mineral':'drip';
  else if(['loading','aisle','service'].includes(role))kind=i%2===0?'mud':'scuff';
  else if(site.condition==='neglected')kind=i%3===0?'chip':'stain';
  else kind=i%2===0?'scuff':'scratch';
  if(surface==='carpet'&&['scrape','rust','mineral'].includes(kind))kind='stain';
  if(mood.maintenance==='clinical'&&['stain','grease'].includes(kind))kind='scuff';
  if((surface==='tile'||surface==='linoleum')&&kind==='dust')kind='scuff';
  const width=8+random()*Math.min(13,room.w*.1);
  const depth=8+random()*Math.min(13,room.h*.1);
  const edge=kind==='dust'||kind==='scuff';
  const dx=edge?(random()<.5?width/2+5:room.w-width/2-5):
   width/2+5+random()*Math.max(0,room.w-width-10);
  const dy=edge?(random()<.5?depth/2+5:room.h-depth/2-5):
   depth/2+5+random()*Math.max(0,room.h-depth-10);
  // Find actual circulation thresholds, not arbitrary middle-of-room stains.
  const touching=site.doors.filter(door=>{
   const x=(door.a.x+door.b.x)/2,y=(door.a.y+door.b.y)/2;
   return x>=room.x-8&&x<=room.x+room.w+8&&
          y>=room.y-8&&y<=room.y+room.h+8;
  });
  const threshold=touching.length&&kind==='scuff'?
   touching[Math.floor(random()*touching.length)]:null;
  const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
  const fixtures=site.cover.filter(o=>o.fixture&&o.x>=room.x&&o.x<=room.x+room.w&&
    o.y>=room.y&&o.y<=room.y+room.h);
  const associated=kind==='oil'||kind==='grease'||kind==='rust'?
    ['vehicle-lift','workbench','compressor','generator','tank','stove']:
    kind==='mineral'||kind==='drip'?['sink','toilet','bathtub','laundry-machine']:[];
  const anchor=associated.length?fixtures.find(o=>associated.includes(o.fixture??'')):undefined;
  const x=anchor?
   clamp(anchor.x,room.x+width/2,room.x+room.w-width/2):threshold?
   clamp((threshold.a.x+threshold.b.x)/2,room.x+width/2,room.x+room.w-width/2):
   room.x+dx;
  const y=anchor?
   clamp(anchor.y,room.y+depth/2,room.y+room.h-depth/2):threshold?
   clamp((threshold.a.y+threshold.b.y)/2,room.y+depth/2,room.y+room.h-depth/2):
   room.y+dy;
  const opacity=site.condition==='disturbed'?.2:site.condition==='neglected'?.15:.09;
  marks.push({id:room.id+':wear:'+i,roomId:room.id,kind,
   x,y,width,depth,rotation:Math.floor(random()*4)*Math.PI/2,opacity});
 }
 return marks;
}
