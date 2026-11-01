/** MAP 10: subtle visual wear from a building's deterministic condition.
 * A decorative layer only: no physics, pathfinding or intel mutations.
 */
import {seeded,type Site} from '../breach-site.ts';
export type WearKind='dust'|'stain'|'scrape'|'scuff';
export type WearMark={
 id:string;roomId:string;kind:WearKind;x:number;y:number;
 width:number;depth:number;rotation:number;opacity:number;
};
const conditionCounts:Record<NonNullable<Site['condition']>,number>={
 occupied:0,busy:1,neglected:4,vacant:2,renovation:3,disturbed:4,
};
export function planEnvironmentalWear(site:Site):WearMark[]{
 const count=conditionCounts[site.condition??'occupied'];
 if(count===0)return [];
 const random=seeded(site.seed^0x66ee4a12),marks:WearMark[]=[];
 const all:readonly WearKind[]=['dust','stain','scrape','scuff'];
 for(const room of site.rooms){
  if(room.w<40||room.h<40)continue;
  const amount=Math.min(5,count)*(room.kind==='hall'?.5:1);
  for(let i=0;i<Math.floor(amount);i++){
   const kind=site.condition==='renovation'?
     (i%2===0?'scrape':'dust'):site.condition==='disturbed'?
     (i%3===0?'stain':'scuff'):all[Math.floor(random()*all.length)];
   const width=7+random()*Math.min(19,room.w*.15);
   const depth=8+random()*Math.min(20,room.h*.15);
   const mx=room.x+Math.max(10,width/2+2);
   const my=room.y+Math.max(10,depth/2+2);
   const x=mx+random()*Math.max(0,room.x+room.w-mx-width/2-8);
   const y=my+random()*Math.max(0,room.y+room.h-my-depth/2-8);
   const opacity=site.condition==='disturbed'?.26:
     site.condition==='neglected'?.23:.15;
   marks.push({id:room.id+':wear:'+i,roomId:room.id,
     kind,x,y,width,depth,rotation:Math.floor(random()*4)*Math.PI/2,opacity});
  }
 }
 return marks;
}
