/** Choose actual operable door assemblies from the spaces they connect.
 * Door geometry, latch and track are simulation-authoritative; this module
 * only selects a compatible construction and mechanism for each opening.
 */
import {type Site,type BuildingArchetype,type Room} from '../breach-site.ts';
import type {Door,DoorStyle,Pt} from '../breach-core.ts';

const exterior:Record<BuildingArchetype,DoorStyle>={
 house:'wood',townhouse:'wood',apartment:'steel',
 retail:'steel',office:'steel',garage:'steel',
 warehouse:'reinforced',restaurant:'wood',motel:'steel',
 utility:'reinforced',clinic:'steel',
};
const protectedRooms=new Set(['bathroom','restroom','bedroom','guest',
 'exam','treatment','supply','staff','laundry']);
const publicRooms=new Set(['sales','checkout','lobby','reception','waiting',
 'dining','living','hallway','meeting','cubicles','office']);
const industrialRooms=new Set(['bay','workshop','parts','loading','packing',
 'storage','stockroom','equipment','control','maintenance','service','aisle']);
const midpoint=(d:Door):Pt=>({x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2});
function adjoining(site:Site,door:Door):[Room|undefined,Room|undefined]{
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const len=Math.hypot(dx,dy)||1,p=midpoint(door),nx=-dy/len,ny=dx/len;
 const at=(side:number)=>site.rooms.find(r=>{
  const x=p.x+nx*side,y=p.y+ny*side;
  return x>r.x+1&&x<r.x+r.w-1&&y>r.y+1&&y<r.y+r.h-1;
 });
 return [at(14),at(-14)];
}
export function styleArchitecturalDoors(site:Site,seed:number):Site{
 const kind=site.archetype??'house';
 const doors=site.doors.map((door,index):Door=>{
  if(door.kind==='shutter')return {...door,style:'steel'};
  const [a,b]=adjoining(site,door);
  const roles=[a?.purpose??'',b?.purpose??''];
  const outside=!a||!b;
  const privateAccess=roles.some(r=>protectedRooms.has(r));
  const workingAccess=roles.some(r=>industrialRooms.has(r));
  const publicAccess=roles.some(r=>publicRooms.has(r));
  const isFront=door.id==='FRONT',isCourt=door.id.startsWith('COURT-');
  const isService=door.id==='SERVICE';
  let finish:DoorStyle='wood';
  let mode:Door['kind']=door.kind;
  if(door.pairedWith){
   // Both leaves of a double opening must agree on construction.
   finish=['retail','restaurant','office'].includes(kind)?'glazed':'wood';
  }else if(isFront){
   finish=['retail','restaurant','office','clinic'].includes(kind)?'glazed':
     exterior[kind];
   if(kind==='retail'&&seed%3===0)mode='sliding';
   if(['house','townhouse'].includes(kind)&&seed%7===2)finish='french';
  }else if(isCourt){
   finish=['house','townhouse','restaurant','motel','apartment'].includes(kind)?
     'glazed':'steel';
   if(['house','townhouse','restaurant','motel'].includes(kind)&&seed%2===0)
     mode='sliding';
   if(['house','townhouse'].includes(kind)&&seed%7===3){
     finish='screen';mode='hinged';
   }
  }else if(isService||outside){
   finish=['warehouse','utility'].includes(kind)?'reinforced':
     ['garage','office','clinic','retail','motel'].includes(kind)?'fire':'wood';
   if(isService&&['garage','warehouse'].includes(kind)&&seed%7===4){
     finish='barn';mode='sliding';
   }else if(isService&&kind==='warehouse'&&seed%5===0){
     finish='steel';mode='sliding';
   }
  }else if(privateAccess){
   // Bedrooms, wet rooms and patient rooms must never acquire transparent
   // doors simply because a random seed happens to pick glass.
   finish=['clinic','utility'].includes(kind)?'wood':'wood';
   if(roles.some(r=>r==='bathroom'||r==='restroom')&&
     ['house','townhouse','apartment','office'].includes(kind)&&index%5===2){
     finish='pocket';mode='sliding';
   }else if(roles.includes('laundry')&&index%3===0)finish='louvered';
  }else if(['warehouse','utility','garage'].includes(kind)&&workingAccess){
   finish=kind==='utility'?'reinforced':index%3===0?'reinforced':'steel';
  }else if(kind==='restaurant'&&roles.some(r=>['kitchen','pantry','service'].includes(r))){
   finish='fire';
  }else if(kind==='office'&&publicAccess&&
    roles.some(r=>['meeting','reception','lobby','cubicles'].includes(r))){
   finish=index%4===0?'pocket':'glazed';
   if(finish==='pocket')mode='sliding';
  }else if(kind==='clinic'&&
    roles.every(r=>r&&['waiting','reception','hallway'].includes(r))){
   finish='glazed';
  }else if(kind==='retail'&&
    roles.every(r=>r&&['sales','checkout','service','office'].includes(r))){
   finish=roles.includes('service')?'steel':'glazed';
  }else if(['house','townhouse','apartment'].includes(kind)&&
    roles.includes('living')&&roles.includes('dining')&&index%3===0){
   finish='french';
  }else if(workingAccess){
   finish=index%5===0?'fire':'steel';
  }
  const strength=finish==='reinforced'?{resistance:2.2,latchIntegrity:2.1,
    frameIntegrity:4.8}:finish==='fire'?{resistance:1.9,latchIntegrity:1.7,
    frameIntegrity:4.2}:finish==='steel'?{resistance:1.4,latchIntegrity:1.25,
    frameIntegrity:3.2}:finish==='exit'?{resistance:1.15,latchIntegrity:1.1,
    frameIntegrity:3}:null;
  return {...door,style:finish,kind:mode,
    ...(mode==='sliding'?{slideDirection:(seed%2===0?1:-1) as 1|-1}:{}),
    ...(strength??{})};
 });
 return {...site,doors};
}
