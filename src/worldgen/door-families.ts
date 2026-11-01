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
  const sliding=door.kind!=='shutter'&&!door.pairedWith&&(
    (door.id==='FRONT'&&kind==='retail'&&seed%3===0)||
    (door.id.startsWith('COURT-')&&['house','townhouse','restaurant','motel'].includes(kind)&&seed%2===0)||
    (door.id==='SERVICE'&&kind==='warehouse'&&seed%5===0));
  const style:DoorStyle=door.kind==='shutter'?'steel':
    sliding?(kind==='warehouse'?'steel':'glazed'):
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
  // Secondary construction families retain authoritative hinge or sliding mechanics.
  // Split Dutch and folding leaf mechanisms are intentionally not emulated here.
  let finish:DoorStyle=style;
  let mode:Door['kind']=sliding?'sliding':door.kind;
  if(!door.pairedWith&&door.kind!=='shutter'){
    if(door.id==='FRONT'&&['house','townhouse'].includes(kind)&&seed%7===2)
      finish='french';
    else if(door.id.startsWith('COURT-')&&kind==='house'&&seed%7===3)
      finish='screen';
    else if(door.id==='SERVICE'&&['garage','warehouse'].includes(kind)&&seed%7===4){
      finish='barn';mode='sliding';
    }else if(door.id==='SERVICE'&&['clinic','office','utility'].includes(kind)&&seed%5===1)
      finish='fire';
    else if(door.id.startsWith('D')&&['house','townhouse','apartment'].includes(kind)&&index%9===3)
      finish='louvered';
    else if(door.id.startsWith('D')&&kind==='office'&&index%9===4){
      finish='pocket';mode='sliding';
    }
  }
  return {...door,style:finish,
    ...(mode==='sliding'?{kind:'sliding' as const,
       slideDirection:(seed%2===0?1:-1) as 1|-1}:{}),
    ...(strength??{})};
 });
 void seed;
 return {...site,doors};
}
