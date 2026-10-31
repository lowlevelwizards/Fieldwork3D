/** Geometry-aware functional program placement.
 * Entrances get public-facing spaces; private/service rooms sit deeper in the
 * property. Prefer related rooms along a shared edge over arbitrary sorting.
 */
import type {Site,Room,BuildingArchetype} from '../breach-site.ts';
import {programRooms} from './building-programs.ts';
const publicRoles=new Set(['reception','checkout','sales','lobby','waiting',
 'dining','studio','living','service','bay']);
const privateRoles=new Set(['bedroom','guest','bathroom','restroom','stockroom',
 'storage','pantry','parts','utility','equipment','control','maintenance']);
const largeRoles=new Set(['living','sales','bay','storage','aisle','dining','loading',
 'cubicles','workshop','equipment']);
const tinyRoles=new Set(['bathroom','restroom','pantry','utility','closet']);
const pairs:Record<string,string[]>={
 kitchen:['dining','living','pantry','service'],
 dining:['kitchen','living','service'],
 bedroom:['bathroom','living'],
 guest:['bathroom','hallway'],
 checkout:['sales','stockroom'],
 stockroom:['sales','checkout','loading'],
 bay:['workshop','parts','waiting'],
 loading:['aisle','storage','packing'],
 office:['reception','cubicles','meeting'],
 exam:['waiting','treatment','supply'],
 reception:['waiting','office','lobby'],
 studio:['kitchen','bathroom'],
};
const center=(r:Room)=>({x:r.x+r.w/2,y:r.y+r.h/2});
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
const sharedEdge=(a:Room,b:Room)=>{
 const xTouch=Math.abs(a.x+a.w-b.x)<.01||Math.abs(b.x+b.w-a.x)<.01;
 const yTouch=Math.abs(a.y+a.h-b.y)<.01||Math.abs(b.y+b.h-a.y)<.01;
 const overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
 const overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
 return xTouch&&overlapY>28||yTouch&&overlapX>28;
};
const priority=(purpose:string)=>publicRoles.has(purpose)?0:
 largeRoles.has(purpose)?1:privateRoles.has(purpose)?3:2;
export function assignRoomProgram(site:Site,kind:BuildingArchetype):Map<string,string>{
 const available=site.rooms.filter(r=>r.kind==='room');
 const intended=programRooms(kind,available.length).map((role,index)=>({role,index}));
 intended.sort((a,b)=>priority(a.role)-priority(b.role)||a.index-b.index);
 const assigned=new Map<string,string>();
 if(!available.length)return assigned;
 const entry=site.entrance;
 const distances=available.map(r=>distance(center(r),entry));
 const min=Math.min(...distances),span=Math.max(1,Math.max(...distances)-min);
 const areas=available.map(r=>r.w*r.h);
 const minArea=Math.min(...areas),areaSpan=Math.max(1,Math.max(...areas)-minArea);
 for(const {role} of intended){
  const candidates=available.filter(r=>!assigned.has(r.id));
  const preferred=pairs[role]??[];
  candidates.sort((a,b)=>{
   const score=(r:Room)=>{
    const front=(distance(center(r),entry)-min)/span;
    const area=(r.w*r.h-minArea)/areaSpan;
    const zone=publicRoles.has(role)?front*120:
      privateRoles.has(role)?(1-front)*100:front*30;
    const size=largeRoles.has(role)?(1-area)*42:
      tinyRoles.has(role)?area*35:0;
    const related=available.filter(other=>preferred.includes(assigned.get(other.id)??''));
    const adjacency=related.length?
      Math.min(...related.map(other=>sharedEdge(r,other)?-44:
        distance(center(r),center(other))/2)):0;
    return zone+size+adjacency;
   };
   return score(a)-score(b)||a.id.localeCompare(b.id);
  });
  if(candidates[0])assigned.set(candidates[0].id,role);
 }
 return assigned;
}
