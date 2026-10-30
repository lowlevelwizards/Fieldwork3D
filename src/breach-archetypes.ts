/** Semantic building types; furnishing data preserves authored collision. */
import type {Site,BuildingArchetype,Room} from './breach-site.ts';
import {buildArchetypeEnvironment} from './breach-windows.ts';
export const BUILDING_ARCHETYPES:readonly BuildingArchetype[]=
 ['house','office','motel','garage','warehouse','clinic'];
const ROOMS:Record<BuildingArchetype,readonly string[]>={
 house:['living','kitchen','bedroom','bedroom','bathroom','utility'],
 office:['reception','cubicles','office','meeting','break','storage'],
 motel:['reception','guest','guest','guest','laundry','maintenance'],
 garage:['bay','workshop','office','parts','utility','storage'],
 warehouse:['loading','storage','aisle','packing','office','utility'],
 clinic:['reception','waiting','exam','treatment','supply','staff']
};
const FIXTURES:Record<string,readonly string[]>={
 living:['table','cabinet'],kitchen:['counter','table'],
 bedroom:['bed','cabinet'],bathroom:['cabinet'],utility:['shelf'],
 reception:['desk','counter'],cubicles:['desk','cabinet'],
 office:['desk','cabinet'],meeting:['table'],break:['table','counter'],
 storage:['shelf','crate'],guest:['bed','cabinet'],
 laundry:['machine','shelf'],maintenance:['shelf','workbench'],
 bay:['machine','workbench'],workshop:['workbench','shelf'],
 parts:['shelf','crate'],loading:['crate','pallet'],
 aisle:['shelf','pallet'],packing:['table','crate'],
 waiting:['chair','table'],exam:['exam-bed','cart'],
 treatment:['exam-bed','cart'],supply:['cabinet','cart'],
 staff:['desk','locker']
};
const midpoint=(r:Room)=>({x:r.x+r.w/2,y:r.y+r.h/2});
export function applyArchetype(site:Site,seed:number):Site{
  const archetype=BUILDING_ARCHETYPES[(seed>>>0)%BUILDING_ARCHETYPES.length];
  const sorted=site.rooms.filter(r=>r.kind==='room').slice().sort(
    (a,b)=>midpoint(b).y-midpoint(a).y||midpoint(a).x-midpoint(b).x);
  const assignments=new Map<string,string>();
  sorted.forEach((r,i)=>assignments.set(r.id,
    ROOMS[archetype][i%ROOMS[archetype].length]));
  const rooms=site.rooms.map(r=>({...r,purpose:r.kind==='hall'?
    'hallway':assignments.get(r.id)??'storage'}));
  const cover=site.cover.map((o,i)=>{
    const room=rooms.find(r=>o.x>=r.x&&o.x<=r.x+r.w&&
      o.y>=r.y&&o.y<=r.y+r.h);
    const collection=FIXTURES[room?.purpose??'storage']??['crate'];
    return {...o,fixture:collection[(i+seed)%collection.length]};
  });
  return buildArchetypeEnvironment({...site,archetype,rooms,cover},seed);
}
