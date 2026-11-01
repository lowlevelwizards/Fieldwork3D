/** Furniture facing is a placement decision, not a decorative mesh rotation.
 * Cardinal turns preserve axis-aligned tactical footprints and pathfinding.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {fixtureServiceClear} from './fixture-service-clearance.ts';
import {SERVICE_COUNTERS,counterApproachFor} from './service-counter-access.ts';
export type QuarterTurn=0|1|2|3;
const directional=new Set(['reception-desk','transaction-counter','parts-counter','bar-stool','chair','office-chair','armchair','sofa','bench','patio-chair',
 'desk','bed','exam-bed','toilet','sink','stove','fridge','counter','cabinet',
 'bookcase','shelf','rack','wall-shelf','wardrobe','dresser','tv-stand','workbench',
 'checkout','reception-desk','transaction-counter','parts-counter','control-panel','meeting-table','dining-table',
 'prep-table','commercial-range','dish-station','handwash-station',
 'instrument-cart','retail-endcap','packing-station','parts-bin']);
const facing:readonly Pt[]=[{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}];
const activeFixtures=new Set(['chair','office-chair','bar-stool','armchair','sofa','bench','patio-chair',
 'desk','toilet','sink','stove','fridge','checkout',
 'reception-desk','transaction-counter','parts-counter','workbench','control-panel',
 'commercial-range','handwash-station','prep-table']);
// Pulled-out seats are typically approached from behind or the aisle side.
 // Reserving an empty area *between* a dining chair and its table makes
 // the chair incorrectly face away from the table.
const rearApproach=new Set(['chair','office-chair','bar-stool','patio-chair']);
const groups:Record<string,readonly string[]>={
 'bar-stool':['bar-counter'],
 'office-chair':['desk','reception-desk','meeting-table','control-panel','checkout'],
 chair:['dining-table','meeting-table','coffee-table','desk','checkout'],
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
 if(activeFixtures.has(item.fixture??'')){
  const face=facing[turn],depth=turn%2?w:h;
  const sign=rearApproach.has(item.fixture??'')?-1:1;
  const reach={x:item.x+sign*face.x*(depth/2+8),
    y:item.y+sign*face.y*(depth/2+8)};
  if(reach.x<r.x+8||reach.x>r.x+r.w-8||
    reach.y<r.y+8||reach.y>r.y+r.h-8)return false;
  if(out.some((o,j)=>j!==index&&Math.abs(o.x-reach.x)<o.w/2+3&&
    Math.abs(o.y-reach.y)<o.h/2+3))return false;
 }
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
  // Waiting seats orient to the reception desk even when the desk is in
  // a neighboring foyer. Avoid arbitrary facing toward the room center.
  const waiting=['waiting','lobby'].includes(room.purpose??'');
  const reception=waiting?out.filter(o=>['desk','checkout','counter','reception-desk','transaction-counter'].includes(o.fixture??''))
    .sort((a,b)=>near(item,a)-near(item,b))[0]:undefined;
  const goal=target??reception??{x:room.x+room.w/2,y:room.y+room.h/2};
  const dx=goal.x-item.x,dy=goal.y-item.y;
  // Cardinal directions are ranked by actual visual front (+world Y at turn 0).
  const ranked=([0,1,2,3] as QuarterTurn[]).sort((a,b)=>
    (facing[b].x*dx+facing[b].y*dy)-(facing[a].x*dx+facing[a].y*dy)||
    a-b);
  const shaped=(turn:QuarterTurn):Obstacle=>{
   const dims=rotatedFootprint(item,turn);
   return {...item,w:dims.w,h:dims.h,orientation:turn};
  };
  const counterScore=(turn:QuarterTurn):number=>{
   const candidate=shaped(turn),surroundings=out.slice();
   surroundings[i]=candidate;
   const access=counterApproachFor(room,candidate,surroundings,site);
   return Number(access.customerClear)+Number(access.staffClear);
  };
  const canUse=(turn:QuarterTurn)=>{
   if(!legal(site,out,i,room,turn))return false;
   const candidate=shaped(turn);
   if(!fixtureServiceClear(room,candidate,out,i))return false;
   if(SERVICE_COUNTERS.has(fixture))return counterScore(turn)===2;
   return true;
  };
  // A reception/check-out counter needs two genuine operating sides.
  // If the geometry cannot satisfy both, maximize accessible sides instead
  // of pretending its original direction is a functional workstation.
  const fallback=SERVICE_COUNTERS.has(fixture)?
   ranked.filter(turn=>legal(site,out,i,room,turn)).sort((a,b)=>
    counterScore(b)-counterScore(a))[0]:
   ranked.find(turn=>legal(site,out,i,room,turn));
  const turn=ranked.find(canUse)??fallback;
  if(turn===undefined)continue; // never force an invalid collision.
  const dims=rotatedFootprint(item,turn);
  out[i]={...item,w:dims.w,h:dims.h,orientation:turn};
 }
 return out;
}
