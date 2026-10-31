/** Optional expanded property wings with real wall cuts and physical door leaves.
 * Never mutates the legacy seed layout or rescales a door/actor collision capsule. */
import {type Site,type Room} from '../breach-site.ts';
import type {Door,Segment} from '../breach-core.ts';
const close=(a:number,b:number)=>Math.abs(a-b)<.01;
const midpoint=(a:number,b:number)=>(a+b)/2;
export function expandProperty(site:Site,seed:number):Site{
 const east=Math.max(...site.rooms.map(r=>r.x+r.w));
 const wallMatches=site.walls.map((wall,index)=>({wall,index})).filter(({wall})=>
  close(wall.a.x,east)&&close(wall.b.x,east)&&
  Math.abs(wall.b.y-wall.a.y)>=112);
 const candidates=wallMatches.flatMap(({wall,index})=>site.rooms.filter(r=>
  r.kind==='room'&&close(r.x+r.w,east)&&r.h>=115).map(room=>({
    wall,index,room,center:room.y+room.h/2
  })).filter(({wall,center})=>{
    const lo=Math.min(wall.a.y,wall.b.y),hi=Math.max(wall.a.y,wall.b.y);
    return center>lo+39&&center<hi-39&&
      site.doors.every(d=>Math.hypot(east-midpoint(d.a.x,d.b.x),
        center-midpoint(d.a.y,d.b.y))>70);
  })).sort((a,b)=>a.center-b.center);
 const selected:typeof candidates=[];
 for(const candidate of candidates){
  if(selected.some(c=>c.room.id===candidate.room.id||c.index===candidate.index))continue;
  selected.push(candidate);
  if(selected.length===2)break;
 }
 if(!selected.length)return site;
 const walls=site.walls.slice(),doors=site.doors.slice(),rooms=site.rooms.slice();
 for(let i=selected.length-1;i>=0;i--){
  const {wall,index,room,center}=selected[i];
  const sizeY=Math.min(room.h-10,124);
  const top=center-sizeY/2,bottom=center+sizeY/2;
  const newEast=east+148,topDoor=center-24,bottomDoor=center+24;
  const ascending=wall.b.y>wall.a.y;
  const near={x:east,y:ascending?topDoor:bottomDoor};
  const far={x:east,y:ascending?bottomDoor:topDoor};
  const inserted:Segment[]=[
   {a:wall.a,b:near},{a:far,b:wall.b},
   {a:{x:east,y:top},b:{x:newEast,y:top}},
   {a:{x:newEast,y:top},b:{x:newEast,y:bottom}},
   {a:{x:newEast,y:bottom},b:{x:east,y:bottom}}
  ];
  walls.splice(index,1,...inserted);
  const id='EXPANDED-'+seed+'-'+i;
  const a={x:east,y:topDoor},b={x:east,y:bottomDoor};
  const door:Door={id,a,b,open:false,openedAt:-1};
  doors.push(door);
  const annex:Room={id,x:east,y:top,w:148,h:sizeY,kind:'room',tone:(seed+i)%4};
  rooms.push(annex);
 }
 return {...site,walls,doors,rooms,roomCount:site.roomCount+selected.length,
   scale:'expanded',bounds:{minX:0,minY:0,maxX:east+148+65,maxY:740}};
}
