/** Physical L/T footprint variation by attaching a real rear annex.
 * Adds one properly connected room and cuts the shared wall for a real door.
 * Geometry remains within the existing tactical world boundary.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Door} from '../breach-core.ts';
const near=(a:number,b:number)=>Math.abs(a-b)<.01;
export function appendArchitecturalWing(site:Site,seed:number):Site{
 if(seed%3!==1)return site;
 const minY=Math.min(...site.rooms.map(r=>r.y));
 const top=site.walls.map((wall,index)=>({wall,index})).filter(({wall})=>
  near(wall.a.y,minY)&&near(wall.b.y,minY)&&
  Math.abs(wall.b.x-wall.a.x)>=125).sort((a,b)=>
   Math.abs(b.wall.b.x-b.wall.a.x)-Math.abs(a.wall.b.x-a.wall.a.x));
 const selected=top.flatMap(({wall,index})=>site.rooms.filter(room=>
   room.kind==='room'&&near(room.y,minY)&&room.w>=125).map(room=>({
    wall,index,room,center:room.x+room.w/2
   })).filter(candidate=>{
    const {center}=candidate,wall=candidate.wall;
    const lo=Math.min(wall.a.x,wall.b.x),hi=Math.max(wall.a.x,wall.b.x);
    return center>lo+38&&center<hi-38&&
      site.doors.every(d=>Math.hypot(center-(d.a.x+d.b.x)/2,
        minY-(d.a.y+d.b.y)/2)>75);
   })).sort((a,b)=>b.room.w-a.room.w)[0];
 if(!selected)return site;
 const {wall,room,center}=selected;
 const width=Math.min(112,room.w-20,Math.abs(wall.b.x-wall.a.x)-24);
 const height=Math.min(61,minY-32);
 if(width<90||height<42)return site;
 const left=center-width/2,right=center+width/2,y=minY-height;
 const entryA={x:center-24,y:minY},entryB={x:center+24,y:minY};
 // Keep original wall ends, but open its center for an authoritative door.
 const walls=site.walls.slice();
 walls.splice(selected.index,1,
  {a:wall.a,b:entryA},{a:entryB,b:wall.b},
  {a:{x:left,y:minY},b:{x:left,y}},
  {a:{x:left,y},b:{x:right,y}},
  {a:{x:right,y},b:{x:right,y:minY}});
 const doors:Door[]=[...site.doors,{
  id:'ANNEX-'+seed,a:entryA,b:entryB,hinge:'a',swing:-1,
  open:false,openedAt:-1
 }];
 const annex:Room={id:'ANNEX-'+seed,x:left,y,w:width,h:height,
  kind:'room',tone:(seed>>>1)%4};
 return {...site,walls,doors,rooms:[...site.rooms,annex],roomCount:site.roomCount+1};
}
