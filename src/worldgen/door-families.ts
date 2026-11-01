/** MAP 13: door finish and construction use the same authoritative Door.
 * Opaque metal and exit doors remain opaque for the existing physical LOS.
 */
import {type Site,type BuildingArchetype} from '../breach-site.ts';
import type {Door,DoorStyle} from '../breach-core.ts';
const exterior:Record<BuildingArchetype,DoorStyle>={
 house:'wood',townhouse:'wood',apartment:'steel',
 retail:'steel',office:'steel',garage:'steel',
 warehouse:'reinforced',restaurant:'wood',motel:'steel',
 utility:'reinforced',clinic:'steel',
};
export function styleArchitecturalDoors(site:Site,seed:number):Site{
 const doors=site.doors.map((door,index):Door=>{
  const kind=site.archetype??'house';
  const style:DoorStyle=door.kind==='shutter'?'steel':
    door.pairedWith&&['retail','restaurant'].includes(kind)?'glazed':
    door.id==='FRONT'&&['retail','restaurant','office','clinic'].includes(kind)?'glazed':
    door.id==='FRONT'?exterior[kind]:
    ['warehouse','utility','garage'].includes(kind)&&index%3===0?'reinforced':
    ['warehouse','office','clinic','retail','motel'].includes(kind)&&index%4===0?'exit':
    index%5===0?'steel':'wood';
  // Strengthening actual latch/frame resistance is not a visual fake.
  const strength=style==='reinforced'?{resistance:2.2,latchIntegrity:2.1,
    frameIntegrity:4.8}:style==='steel'?{resistance:1.4,latchIntegrity:1.25,
    frameIntegrity:3.2}:style==='exit'?{resistance:1.15,
    latchIntegrity:1.1,frameIntegrity:3}:null;
  return {...door,style,...(strength??{})};
 });
 void seed;
 return {...site,doors};
}
