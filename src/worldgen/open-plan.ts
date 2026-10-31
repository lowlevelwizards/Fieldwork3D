/** Promote purposeful adjacent rooms into genuinely wider, doorless openings.
 * Only alters authoritative wall and door geometry; never leaves a visual-only gap.
 */
import {type Site,type Room,seeded} from '../breach-site.ts';
import {type Pt,type Segment} from '../breach-core.ts';
const pairs=new Set([
 'dining|kitchen','dining|living','kitchen|living','checkout|sales',
 'aisle|storage','loading|storage','bay|workshop','dining|service',
 'reception|waiting','kitchen|studio','office|reception'
]);
const close=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y)<.1;
const inside=(p:Pt,r:Room)=>p.x>r.x+.5&&p.x<r.x+r.w-.5&&
 p.y>r.y+.5&&p.y<r.y+r.h-.5;
const length=(s:Segment)=>Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y);
export function addOpenPlanTransitions(site:Site,seed:number):Site{
 const rng=seeded(seed^0x7a34db2);
 const walls=site.walls.map(w=>({a:{...w.a},b:{...w.b}}));
 const doors=[] as Site['doors'],openings=[...(site.openings??[])];
 for(const door of site.doors){
  const center={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const vertical=Math.abs(door.a.x-door.b.x)<.1;
  const left=vertical?{x:center.x-12,y:center.y}:{x:center.x,y:center.y-12};
  const right=vertical?{x:center.x+12,y:center.y}:{x:center.x,y:center.y+12};
  const ra=site.rooms.find(r=>r.kind==='room'&&inside(left,r));
  const rb=site.rooms.find(r=>r.kind==='room'&&inside(right,r));
  const key=ra&&rb?[ra.purpose??'',rb.purpose??''].sort().join('|'):'';
  if(!pairs.has(key)||rng()>.70){doors.push(door);continue;}
  const before=walls.findIndex(w=>close(w.b,door.a));
  const after=walls.findIndex(w=>close(w.a,door.b));
  if(before<0||after<0||before===after||length(walls[before])<29||length(walls[after])<29){
   doors.push(door);continue;
  }
  const base=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
  const vx=(door.b.x-door.a.x)/base,vy=(door.b.y-door.a.y)/base;
  const spread=13;
  const a={x:door.a.x-vx*spread,y:door.a.y-vy*spread};
  const b={x:door.b.x+vx*spread,y:door.b.y+vy*spread};
  walls[before].b=a;walls[after].a=b;
  openings.push({id:'OPEN-'+door.id,a,b,kind:ra?.purpose==='living'?'arch':'wide'});
 }
 return {...site,walls,doors,openings};
}
