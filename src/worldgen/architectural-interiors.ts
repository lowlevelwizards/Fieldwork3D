/** Building-specific, physically blocking low partitions and structural posts.
 * Placement searches several plausible periphery positions rather than assuming
 * every generated room has the same proportions.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
const lowUses=new Set(['living','dining','sales','lobby','office','waiting','reception','cubicles']);
const columnUses=new Set(['bay','loading','storage','aisle','workshop','equipment','service']);
const near=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function addArchitecturalInteriors(site:Site,seed:number):Site{
 const cover=site.cover.slice();
 const critical=[...site.spawn,...site.enemies,site.entrance,site.objective,site.extract];
 let lowCount=0,columnCount=0;
 for(const [i,room] of site.rooms.entries()){
  if(room.kind==='hall')continue;
  const role=room.purpose??'';
  const isLow=lowUses.has(role)&&room.w>=105&&room.h>=82&&lowCount<2;
  const isColumn=!isLow&&columnUses.has(role)&&room.w>=92&&room.h>=85&&columnCount<2;
  if(!isLow&&!isColumn)continue;
  const w=isLow?56:12,h=isLow?9:12;
  const fractions:[[number,number],[number,number],[number,number],
   [number,number],[number,number],[number,number]]=[
    [.3,.3],[.65,.3],[.3,.68],[.68,.68],[.5,.27],[.5,.72]];
  const offset=(seed+i)%fractions.length;
  for(let n=0;n<fractions.length;n++){
   const [fx,fy]=fractions[(n+offset)%fractions.length];
   const x=room.x+room.w*fx,y=room.y+room.h*fy;
   const obj:Obstacle={x,y,w,h,low:isLow,
    fixture:isLow?'half-wall':'support-column',material:isLow?'brick':'concrete'};
   if(x-w/2<=room.x+10||x+w/2>=room.x+room.w-10||
      y-h/2<=room.y+10||y+h/2>=room.y+room.h-10)continue;
   if(site.doors.some(d=>near({x,y},{x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2})<54))continue;
   if((site.windows??[]).some(p=>near({x,y},{x:p.x,y:p.y})<35))continue;
   if(critical.some(p=>Math.abs(p.x-x)<w/2+22&&Math.abs(p.y-y)<h/2+22))continue;
   if(cover.some(o=>Math.abs(o.x-x)<(o.w+w)/2+6&&Math.abs(o.y-y)<(o.h+h)/2+6))continue;
   cover.push(obj);
   if(isLow)lowCount++;else columnCount++;
   break;
  }
 }
 return {...site,cover};
}
