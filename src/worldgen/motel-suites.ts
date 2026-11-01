/** Partition each motel guest room into a private bathroom and sleep zone.
 * All boundaries are authoritative tactical walls; bathrooms have real hinged
 * doors and never connect through neighboring guest units.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Segment,Door,Pt} from '../breach-core.ts';
const point=(x:number,y:number):Pt=>({x,y});
const wall=(x:number,y:number,xx:number,yy:number):Segment=>({a:point(x,y),b:point(xx,yy)});
export function partitionMotelGuestUnits(site:Site):Site{
 if(site.archetype!=='motel')return site;
 const rooms:Room[]=[],walls=[...site.walls],doors:Door[]=[...site.doors];
 const units:NonNullable<Site['units']>=[];
 const relocate=(p:Pt,room:Room,newRoom:Room):Pt=>
  p.x>room.x&&p.x<room.x+room.w&&p.y>room.y&&p.y<room.y+room.h?
    {x:newRoom.x+newRoom.w/2,y:newRoom.y+newRoom.h/2}:p;
 let objective=site.objective;
 const enemies=site.enemies.map(p=>({...p}));
 for(const room of site.rooms){
  if(room.purpose!=='guest'||room.w<100||room.h<115){rooms.push(room);continue;}
  const compact=room.w<132;
  const bathWidth=compact?room.w:Math.min(74,Math.max(61,Math.floor(room.w*.48)));
  const bathDepth=Math.min(82,room.h-65);
  const unitId='SUITE-'+room.id;
  const bathId=room.id+'-BATH';
  const sleepId=room.id+'-SLEEP';
  const sleep:Room={...room,id:sleepId,unitId,
   x:room.x,y:room.y+bathDepth,w:room.w,h:room.h-bathDepth};
  const bath:Room={...room,id:bathId,unitId,zoneId:bathId,
   x:room.x,y:room.y,w:bathWidth,h:bathDepth,purpose:'bathroom'};
  rooms.push(sleep);
  const ids=[sleepId,bathId];
  if(!compact){
   const side:Room={...room,id:room.id+'-SIDE',unitId,
    x:room.x+bathWidth,y:room.y,w:room.w-bathWidth,h:bathDepth};
   rooms.push(side);
   ids.push(side.id);
   walls.push(wall(room.x+bathWidth,room.y,room.x+bathWidth,room.y+bathDepth));
  }
  rooms.push(bath);
  const doorWidth=48,half=doorWidth/2,cx=room.x+bathWidth/2,y=room.y+bathDepth;
  const l=cx-half,r=cx+half;
  if(l>room.x+1)walls.push(wall(room.x,y,l,y));
  if(r<room.x+bathWidth-1)walls.push(wall(r,y,room.x+bathWidth,y));
  doors.push({id:'BATH-'+room.id,a:point(l,y),b:point(r,y),
   kind:'hinged',open:false,openedAt:-1});
  objective=relocate(objective,room,sleep);
  for(let i=0;i<enemies.length;i++)enemies[i]=relocate(enemies[i],room,sleep);
  units.push({id:unitId,kind:'motel',roomIds:ids});
 }
 return {...site,rooms,walls,doors,units,objective,enemies,
  roomCount:rooms.filter(r=>r.kind==='room').length};
}
