/** Semantic building types; furnishing data preserves authored collision. */
import type {Site,BuildingArchetype} from './breach-site.ts';
import {buildArchetypeEnvironment} from './breach-windows.ts';
import {propDefinition} from './worldgen/asset-catalog.ts';
import {furnishRooms} from './worldgen/room-furnishing.ts';
import {assignRoomProgram} from './worldgen/room-assignment.ts';
import {programRooms} from './worldgen/building-programs.ts';
import {activeSite,activateSite,passable,route} from './breach-core.ts';
import {addOpenPlanTransitions} from './worldgen/open-plan.ts';
import {dressSite} from './worldgen/environment-dresser.ts';
import {populateFunctionalRooms} from './worldgen/scenario-population.ts';
export const BUILDING_ARCHETYPES:readonly BuildingArchetype[]=
 ['house','townhouse','apartment','retail','office','garage','warehouse','restaurant','motel','utility','clinic'] as const;
const FIXTURES:Record<string,readonly string[]>={
  studio:['bed','sofa'],dining:['dining-table','chair'],study:['desk','bookcase'],
  'garage-storage':['shelf','tire-stack'],sales:['gondola-shelf','wall-shelf'],
  checkout:['checkout','display-rack'],stockroom:['rack','box'],pantry:['shelf','box'],
  restroom:['cabinet'],service:['rack','cart'],equipment:['generator','tank'],
  control:['control-panel'],lobby:['desk','armchair'],
 living:['sofa','tv-stand','bookcase','coffee-table','armchair'],kitchen:['counter','dining-table','fridge'],
 bedroom:['bed','wardrobe','dresser','nightstand'],bathroom:['cabinet'],utility:['shelf'],
 reception:['desk','counter'],cubicles:['desk','filing-cabinet'],
 office:['desk','filing-cabinet'],meeting:['meeting-table'],break:['dining-table','counter'],
 storage:['shelf','crate','box','barrel'],guest:['bed','dresser'],
 laundry:['machine','shelf'],maintenance:['shelf','workbench'],
 bay:['vehicle-lift','workbench','tire-stack'],workshop:['workbench','tool-chest','compressor'],
 parts:['shelf','crate','tire-stack'],loading:['crate','pallet','barrel'],
 aisle:['rack','pallet'],packing:['table','box'],
 waiting:['chair','table'],exam:['exam-bed','cart'],
 treatment:['exam-bed','cart'],supply:['cabinet','cart'],
 staff:['desk','locker']
};
/** Preserve simulation-authoritative circulation when a room program changes.
 * A failed candidate falls back to the previous, known-playable room ordering.
 * This check happens only during generation, never per frame.
 */
const routeCheckCache=new Map<string,boolean>();
function reachable(site:Site):boolean{
  const key=site.seed+':'+(site.scale??'standard')+':'+
    site.rooms.map(r=>r.id+'='+r.purpose).join(',')+':'+site.cover.length;
  const known=routeCheckCache.get(key);
  if(known!==undefined)return known;
  const previous=activeSite();
  let valid=false;
  activateSite(site);
  try{
    // Critical route is authoritative, but expensive A* should only execute
    // once for a reproducible seed/room-program candidate.
    valid=[...site.spawn,...site.enemies,site.objective].every(p=>passable(p))&&
      route(site.spawn[0],site.objective).length>0;
  }finally{activateSite(previous);}
  if(routeCheckCache.size>=512)routeCheckCache.clear();
  routeCheckCache.set(key,valid);
  return valid;
}
export function applyArchetype(site:Site,seed:number):Site{
  const archetype=BUILDING_ARCHETYPES[(seed>>>0)%BUILDING_ARCHETYPES.length];
  const build=(assignments:Map<string,string>):Site=>{
    const rooms=site.rooms.map(r=>({...r,purpose:r.kind==='hall'?
      'hallway':assignments.get(r.id)??'storage'}));
    const cover=site.cover.map((o,i)=>{
      const room=rooms.find(r=>o.x>=r.x&&o.x<=r.x+r.w&&
        o.y>=r.y&&o.y<=r.y+r.h);
      const collection=FIXTURES[room?.purpose??'storage']??['crate'];
      const fixture=collection[(i+seed)%collection.length];
      const asset=propDefinition(fixture)??propDefinition('crate');
      return {...o,fixture:asset?.id??'crate',low:asset?.cover==='low'};
    });
    const architecture=addOpenPlanTransitions({...site,archetype,rooms,cover},seed);
    const result=populateFunctionalRooms(dressSite(
      buildArchetypeEnvironment(furnishRooms(architecture,seed),seed),seed),seed);
    return {...result,bounds:site.bounds??
      {minX:0,minY:0,maxX:640,maxY:740}};
  };
  // Controlled rollout: keep standard maps fast and proven while sampling
  // the new spatial grammar. Expanded sites always exercise semantic zoning.
  if(site.programLocked){
    const authored=new Map(site.rooms.filter(r=>r.kind==='room').map(r=>
      [r.id,r.purpose??'storage']));
    return build(authored);
  }
  const useZoning=site.scale==='expanded'||seed%3===2;
  const sorted=site.rooms.filter(r=>r.kind==='room').slice().sort(
    (a,b)=>(b.y+b.h/2)-(a.y+a.h/2)||
      (a.x+a.w/2)-(b.x+b.w/2));
  const fallbackRoles=programRooms(archetype,sorted.length);
  const fallback=new Map(sorted.map((r,i)=>[r.id,fallbackRoles[i]]));
  if(!useZoning)return build(fallback);
  const proposal=build(assignRoomProgram(site,archetype));
  if(reachable(proposal))return proposal;
  return build(fallback);
}
