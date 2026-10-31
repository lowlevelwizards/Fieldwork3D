/** Semantic building types; furnishing data preserves authored collision. */
import type {Site,BuildingArchetype} from './breach-site.ts';
import {buildArchetypeEnvironment} from './breach-windows.ts';
import {propDefinition} from './worldgen/asset-catalog.ts';
import {furnishRooms} from './worldgen/room-furnishing.ts';
import {assignRoomProgram} from './worldgen/room-assignment.ts';
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
export function applyArchetype(site:Site,seed:number):Site{
  const archetype=BUILDING_ARCHETYPES[(seed>>>0)%BUILDING_ARCHETYPES.length];
  const assignments=assignRoomProgram(site,archetype);
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
  // Transitional generation remains within the legacy playable envelope.
  return {...result,bounds:site.bounds??
    {minX:0,minY:0,maxX:640,maxY:740}};
}
