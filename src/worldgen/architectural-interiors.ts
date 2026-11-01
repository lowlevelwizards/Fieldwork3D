/** Building-specific half-height masonry partitions and load-bearing posts.
 * Obstacles are real cover and player collision; no render-only geometry.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
const lowUses=new Set(['living','dining','sales','lobby','office','waiting']);
const columnUses=new Set(['bay','loading','storage','aisle','workshop']);
export function addArchitecturalInteriors(site:Site,seed:number):Site{
 const cover=site.cover.slice();
 const critical=[...site.spawn,...site.enemies,site.entrance,site.objective,site.extract];
 let lowCount=0,columnCount=0;
 for(const [i,room] of site.rooms.entries()){
  if(room.kind==='hall'||(seed+i)%3===1)continue;
  const role=room.purpose??'';
  const isLow=lowUses.has(role)&&room.w>=148&&room.h>=111&&lowCount<2;
  const isColumn=!isLow&&columnUses.has(role)&&room.w>=145&&room.h>=135&&columnCount<2;
  if(!isLow&&!isColumn)continue;
  const w=isLow?56:12,h=isLow?9:12;
  // Favor the periphery: preserve the room's center and its main circulation line.
  const x=room.x+room.w*(isLow?.38:.29);
  const y=room.y+room.h*(isLow?.29:.36);
  const obj:Obstacle={x,y,w,h,low:isLow,
   fixture:isLow?'half-wall':'support-column',
   material:isLow?'brick':'concrete'};
  if(x-w/2<=room.x+11||x+w/2>=room.x+room.w-11||
     y-h/2<=room.y+11||y+h/2>=room.y+room.h-11)continue;
  if(site.doors.some(d=>Math.hypot(x-(d.a.x+d.b.x)/2,y-(d.a.y+d.b.y)/2)<54))continue;
  if((site.windows??[]).some(p=>Math.hypot(x-p.x,y-p.y)<48))continue;
  if(critical.some((p:Pt)=>Math.abs(p.x-x)<w/2+26&&Math.abs(p.y-y)<h/2+26))continue;
  if(cover.some(o=>Math.abs(o.x-x)<(o.w+w)/2+7&&Math.abs(o.y-y)<(o.h+h)/2+7))continue;
  cover.push(obj);
  if(isLow)lowCount++;else columnCount++;
 }
 return {...site,cover};
}
