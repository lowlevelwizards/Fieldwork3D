/** Furniture facing is a placement decision, not a decorative mesh rotation.
 * Cardinal turns preserve axis-aligned tactical footprints and pathfinding.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
export type QuarterTurn=0|1|2|3;
const directional=new Set(['chair','office-chair','armchair','sofa','bench','patio-chair',
 'desk','bed','exam-bed','toilet','sink','stove','fridge','counter','cabinet',
 'bookcase','shelf','rack','wall-shelf','wardrobe','dresser','tv-stand','workbench',
 'checkout','control-panel','meeting-table','dining-table',
 'prep-table','commercial-range','dish-station','handwash-station',
 'instrument-cart','retail-endcap','packing-station','parts-bin']);
const facing:readonly Pt[]=[{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}];
const groups:Record<string,readonly string[]>={
 chair:['dining-table','meeting-table','coffee-table','desk','checkout'],
 'office-chair':['desk','meeting-table','control-panel','checkout'],
 'patio-chair':['picnic-table','dining-table'],
 armchair:['coffee-table','tv-stand','sofa'],
 sofa:['tv-stand','coffee-table'],
 bench:['desk','checkout'],
 desk:['office-chair'],
};
const near=(a:Obstacle,b:Obstacle)=>Math.hypot(a.x-b.x,a.y-b.y);
const within=(p:Pt,r:Room)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
export function rotatedFootprint(o:Obstacle,turn:QuarterTurn):{w:number;h:number}{
 return turn%2?{w:o.h,h:o.w}:{w:o.w,h:o.h};
}
function legal(site:Site,out:readonly Obstacle[],index:number,r:Room,turn:QuarterTurn){
 const item=out[index],{w,h}=rotatedFootprint(item,turn);
 if(item.x-w/2<r.x+8||item.x+w/2>r.x+r.w-8||
   item.y-h/2<r.y+8||item.y+h/2>r.y+r.h-8)return false;
 if(out.some((o,j)=>j!==index&&
   Math.abs(o.x-item.x)<(o.w+w)/2+3&&
   Math.abs(o.y-item.y)<(o.h+h)/2+3))return false;
 if(site.doors.some(d=>{
  const x=(d.a.x+d.b.x)/2,y=(d.a.y+d.b.y)/2;
  return Math.abs(x-item.x)<w/2+13&&Math.abs(y-item.y)<h/2+13;
 }))return false;
 return true;
}
export function orientFurnishings(site:Site,items:readonly Obstacle[]):Obstacle[]{
 const out=items.map(o=>({...o}));
 for(let i=0;i<out.length;i++){
  const item=out[i],fixture=item.fixture??'';
  if(!directional.has(fixture))continue;
  const room=site.rooms.find(r=>r.kind==='room'&&within(item,r));if(!room)continue;
  const zone=room.zoneId??room.id;
  const candidates=out.filter((o,j)=>j!==i&&o.fixture&&
    site.rooms.some(r=>r.kind==='room'&&(r.zoneId??r.id)===zone&&within(o,r)));
  const targets=groups[fixture]??[];
  const target=candidates.filter(o=>targets.includes(o.fixture??''))
    .sort((a,b)=>near(a,item)-near(b,item))[0];
  const goal=target??{x:room.x+room.w/2,y:room.y+room.h/2};
  const dx=goal.x-item.x,dy=goal.y-item.y;
  // Cardinal directions are ranked by actual visual front (+world Y at turn 0).
  const ranked=([0,1,2,3] as QuarterTurn[]).sort((a,b)=>
    (facing[b].x*dx+facing[b].y*dy)-(facing[a].x*dx+facing[a].y*dy)||
    a-b);
  const turn=ranked.find(turn=>legal(site,out,i,room,turn));
  if(turn===undefined)continue; // never force an invalid collision.
  const dims=rotatedFootprint(item,turn);
  out[i]={...item,w:dims.w,h:dims.h,orientation:turn};
 }
 return out;
}
