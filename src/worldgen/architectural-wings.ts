/** Physical L/T footprint variation by attaching a real rear annex.
 * Adds one properly connected room and cuts the shared wall for a real door.
 * Geometry remains within the existing tactical world boundary.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Segment,Pt,Door} from '../breach-core.ts';
const near=(a:number,b:number)=>Math.abs(a-b)<.01;
const midpoint=(wall:Segment):Pt=>({
 x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2
});
export function appendArchitecturalWing(site:Site,seed:number):Site{
 if(seed%3!==1)return site;
 const minY=Math.min(...site.rooms.map(r=>r.y));
 const top=site.walls.map((wall,index)=>({wall,index})).filter(({wall})=>
  near(wall.a.y,minY)&&near(wall.b.y,minY)&&
  Math.abs(wall.b.x-wall.a.x)>=125).sort((a,b)=>
   Math.abs(b.wall.b.x-b.wall.a.x)-Math.abs(a.wall.b.x-a.wall.a.x));
 const selected=top.find(({wall})=>{
  const x=midpoint(wall).x;
  return site.rooms.some(room=>room.kind==='room'&&near(room.y,minY)&&
   x>room.x+54&&x<room.x+room.w-54&&
   site.doors.every(d=>Math.hypot(x-(d.a.x+d.b.x)/2,
     minY-(d.a.y+d.b.y)/2)>75));
 });
 if(!selected)return site;
 const wall=selected.wall,center=midpoint(wall).x;
 const room=site.rooms.find(r=>r.kind==='room'&&near(r.y,minY)&&
  center>r.x+54&&center<r.x+r.w-54);
 if(!room)return site;
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
