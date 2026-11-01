/** Human use leaves local traces on actual door approaches, not random floors.
 * Cosmetic only. Every mark is attached to a real doorway and interior room.
 * One whole-site budget protects mobile rendering and high-density floorplans.
 */
import {seeded,type Site} from '../breach-site.ts';
import type {WearMark,WearKind} from './environment-wear.ts';
import {effectiveCondition} from './condition-visual.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';
import {canWear} from './material-properties.ts';

export const THRESHOLD_WEAR_LIMIT=16;
export function planThresholdTrafficWear(site:Site):WearMark[]{
 const condition=effectiveCondition(site)/100;
 if(condition<.2||!site.doors.length)return [];
 const budget=Math.min(THRESHOLD_WEAR_LIMIT,
  Math.max(0,Math.round((site.doors.length+2)*condition*.7)));
 if(!budget)return [];
 const rng=seeded(site.seed^0x1ae58125);
 const marks:WearMark[]=[];
 // The entrance sees the heaviest traffic, then interior transitions.
 const doors=site.doors.slice().sort((a,b)=>Number(b.id==='FRONT')-
  Number(a.id==='FRONT'));
 for(const door of doors){
  if(marks.length>=budget)break;
  const at={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const touching=site.rooms.filter(r=>r.kind==='room'&&
   at.x>=r.x-2&&at.x<=r.x+r.w+2&&
   at.y>=r.y-2&&at.y<=r.y+r.h+2);
  for(const room of touching){
   if(marks.length>=budget)break;
   const middle={x:room.x+room.w/2,y:room.y+room.h/2};
   const dx=middle.x-at.x,dy=middle.y-at.y;
   const len=Math.hypot(dx,dy);
   if(len<.1)continue;
   const surface=roomPixelSurface(site.archetype,room.purpose??room.kind);
   const gritty=['bay','workshop','loading','service','aisle'].includes(room.purpose??'');
   const choices:WearKind[]=gritty?['mud','scuff','scratch']:
    ['wood','rough-wood'].includes(surface)?['scratch','scuff']:
    ['carpet','fabric'].includes(surface)?['scuff','stain']:
    ['scuff','scratch'];
   const kind=choices.find(k=>canWear(surface,k))??'scuff';
   const width=9+rng()*7,depth=7+rng()*5;
   const travel=18+(rng()-.5)*7;
   const x=at.x+dx/len*travel,y=at.y+dy/len*travel;
   if(x-width/2<room.x+5||x+width/2>room.x+room.w-5||
     y-depth/2<room.y+5||y+depth/2>room.y+room.h-5)continue;
   marks.push({id:'traffic:'+door.id+':'+room.id,roomId:room.id,
    kind,x,y,width,depth,
    rotation:Math.atan2(dy,dx),
    opacity:Math.min(.48,.12+condition*.32)});
  }
 }
 return marks;
}
