/** Check whether a real equipment work face can be approached.
 * This is a light, deterministic spatial query. It neither invents furniture
 * nor changes tactical collision; the existing obstacles remain authoritative.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
const workplaces=new Set([
 'sink','toilet','shower','bathtub','stove','fridge','counter','workbench',
 'checkout','reception-desk','transaction-counter','parts-counter',
 'control-panel','exam-bed','vehicle-lift','prep-table',
 'commercial-range','dish-station','handwash-station','instrument-cart',
 'packing-station','parts-bin','retail-endcap'
]);
const paired:Readonly<Record<string,readonly string[]>>={
 checkout:['office-chair','chair'],counter:['chair','office-chair'],
 'reception-desk':['office-chair','chair'],
 'transaction-counter':['office-chair'], 'parts-counter':['office-chair'],
 'exam-bed':['instrument-cart'],workbench:['tool-chest'],
 'packing-station':['cart']
};
/** Equipment requiring a real reachable operating face. */
export const requiresServiceApproach=(fixture?:string):boolean=>
 workplaces.has(fixture??'');
export type ServiceIssue={index:number;roomId:string;fixture:string;
 reason:'faces-wall'|'blocked-approach'};
const inside=(p:Pt,r:Room)=>p.x>r.x+5&&p.x<r.x+r.w-5&&
 p.y>r.y+5&&p.y<r.y+r.h-5;
export function serviceApproachPoint(o:Obstacle,turn=o.orientation??0,offset=16):Pt{
 const half=turn%2===0?o.h/2:o.w/2;
 const dist=half+offset;
 return {x:o.x+(turn===1?dist:turn===3?-dist:0),
   y:o.y+(turn===0?dist:turn===2?-dist:0)};
}
export function fixtureServiceClear(room:Room,item:Obstacle,
 surroundings:readonly Obstacle[],index=-1):boolean{
 if(!workplaces.has(item.fixture??''))return true;
 const p=serviceApproachPoint(item);
 if(!inside(p,room))return false;
 const ignore=paired[item.fixture??'']??[];
 return !surroundings.some((o,i)=>i!==index&&o!==item&&
   !ignore.includes(o.fixture??'')&&
   Math.abs(o.x-p.x)<o.w/2+7&&Math.abs(o.y-p.y)<o.h/2+7);
}
export function auditFixtureService(site:Pick<Site,'rooms'|'cover'>):ServiceIssue[]{
 const issues:ServiceIssue[]=[];
 for(const [index,item] of site.cover.entries()){
  if(!workplaces.has(item.fixture??''))continue;
  const room=site.rooms.find(r=>r.kind==='room'&&
   item.x>r.x&&item.x<r.x+r.w&&item.y>r.y&&item.y<r.y+r.h);
  if(!room)continue;
  const p=serviceApproachPoint(item);
  const reason=!inside(p,room)?'faces-wall':
   fixtureServiceClear(room,item,site.cover,index)?null:'blocked-approach';
  if(reason)issues.push({index,roomId:room.id,fixture:item.fixture!,reason});
 }
 return issues;
}
