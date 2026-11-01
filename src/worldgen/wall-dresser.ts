/** MAP 09: deterministic, nonblocking attachments to actual wall segments. */
import {type Site,seeded} from '../breach-site.ts';
export type WallDetailKind='poster'|'picture'|'noticeboard'|'light-switch'|
 'electrical-box'|'breaker-panel'|'exit-sign'|
 'menu-board'|'promotion-sign'|'business-sign'|'wayfinding-sign'|'safety-sign';
export type WallDetail={
 id:string;roomId:string;kind:WallDetailKind;
 x:number;y:number;height:number;angle:number;width:number;depth:number;
};
const decor:Record<string,readonly WallDetailKind[]>={
 living:['picture','light-switch'],bedroom:['picture','light-switch'],
 guest:['picture','light-switch'],studio:['poster','light-switch'],
 kitchen:['picture','light-switch'],dining:['menu-board','poster','picture'],
 bathroom:['light-switch'],office:['noticeboard','light-switch'],
 meeting:['noticeboard','light-switch'],reception:['wayfinding-sign','noticeboard'],
 waiting:['wayfinding-sign','poster'],exam:['poster','light-switch'],
 treatment:['poster','light-switch'],sales:['promotion-sign','poster'],
 checkout:['promotion-sign','light-switch'],storage:['electrical-box'],
 loading:['safety-sign','electrical-box'],bay:['safety-sign','light-switch'],
 workshop:['safety-sign','breaker-panel'],equipment:['safety-sign','electrical-box'],
 control:['breaker-panel','electrical-box'],aisle:['wayfinding-sign'],
 hallway:['wayfinding-sign','light-switch'],lobby:['wayfinding-sign','noticeboard'],
};
const dist=(ax:number,ay:number,bx:number,by:number)=>Math.hypot(ax-bx,ay-by);
export function decorateWalls(site:Site,seed:number):Site{
 const rng=seeded(seed^0x59a11d3);
 const details:WallDetail[]=[];
 for(const room of site.rooms){
  const vocabulary=decor[room.purpose??'']??(room.kind==='hall'?decor.hallway:['picture','light-switch']);
  const cx=room.x+room.w/2,cy=room.y+room.h/2;
  const surfaces=site.walls.map((wall,index)=>{
   const {a,b}=wall,vertical=Math.abs(a.x-b.x)<.01,
     horizontal=Math.abs(a.y-b.y)<.01;
   const length=dist(a.x,a.y,b.x,b.y);
   if((!vertical&&!horizontal)||length<36)return null;
   const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   // An opening never qualifies: worldgen explicitly cuts these wall spans.
   const onBoundary=vertical?
    (Math.abs(mx-room.x)<1||Math.abs(mx-room.x-room.w)<1)&&
    my>room.y+10&&my<room.y+room.h-10:
    (Math.abs(my-room.y)<1||Math.abs(my-room.y-room.h)<1)&&
    mx>room.x+10&&mx<room.x+room.w-10;
   if(!onBoundary)return null;
   if(site.doors.some(d=>dist(mx,my,(d.a.x+d.b.x)/2,(d.a.y+d.b.y)/2)<39))return null;
   if((site.windows??[]).some(w=>dist(mx,my,w.x,w.y)<39))return null;
   const nx=vertical?Math.sign(cx-mx):0,ny=horizontal?Math.sign(cy-my):0;
   if(!nx&&!ny)return null;
   return {index,mx,my,nx,ny,length};
  }).filter((p):p is NonNullable<typeof p>=>p!==null);
  if(!surfaces.length)continue;
  const shuffled=surfaces.slice().sort((a,b)=>a.index-b.index);
  const count=Math.min(shuffled.length,room.kind==='hall'?1:2);
  const offset=Math.floor(rng()*shuffled.length);
  for(let i=0;i<count;i++){
   const wall=shuffled[(offset+i)%shuffled.length];
   const kind=vocabulary[Math.floor(rng()*vocabulary.length)];
   const width=['light-switch'].includes(kind)?5:
    ['electrical-box','breaker-panel'].includes(kind)?16:
    kind==='exit-sign'?17:
    ['menu-board','business-sign'].includes(kind)?Math.min(37,wall.length-8):
    Math.min(26,wall.length-14);
   const height=kind==='light-switch'?17:kind==='exit-sign'?31:
    ['menu-board','business-sign'].includes(kind)?32:
     kind==='electrical-box'||kind==='breaker-panel'?21:25;
   const shift=5.3;
   details.push({id:room.id+':wall:'+i,roomId:room.id,kind,
     x:wall.mx+wall.nx*shift,y:wall.my+wall.ny*shift,
     height,angle:Math.atan2(wall.nx,wall.ny),
     width,depth:kind==='light-switch'?3:kind==='exit-sign'?7:
      ['menu-board','business-sign'].includes(kind)?17:
      kind==='breaker-panel'?19:16});
  }
 }
 // Exit signs belong beside actual usable exterior thresholds, not on
 // arbitrary hallway segments. A nearby portion of the same solid wall
 // carries the panel; the door leaf remains unobstructed.
 for(const door of site.doors.filter(d=>d.id==='FRONT'||d.id==='SERVICE')){
  const mx=(door.a.x+door.b.x)/2,my=(door.a.y+door.b.y)/2;
  const vertical=Math.abs(door.a.x-door.b.x)<.01;
  const nearby=site.rooms.filter(room=>
   mx>room.x-1&&mx<room.x+room.w+1&&
   my>room.y-1&&my<room.y+room.h+1&&
   (Math.abs(mx-room.x)<1||Math.abs(mx-room.x-room.w)<1||
    Math.abs(my-room.y)<1||Math.abs(my-room.y-room.h)<1));
  const room=nearby.sort((a,b)=>
   dist(a.x+a.w/2,a.y+a.h/2,mx,my)-
   dist(b.x+b.w/2,b.y+b.h/2,mx,my))[0];
  if(!room)continue;
  let spans=site.walls.filter(wall=>{
   const length=dist(wall.a.x,wall.a.y,wall.b.x,wall.b.y);
   if(length<29)return false;
   const wcx=(wall.a.x+wall.b.x)/2,wcy=(wall.a.y+wall.b.y)/2;
   return vertical?
    Math.abs(wall.a.x-mx)<1&&Math.abs(wall.b.x-mx)<1&&
     wcy>room.y&&wcy<room.y+room.h&&Math.abs(wcy-my)<110:
    Math.abs(wall.a.y-my)<1&&Math.abs(wall.b.y-my)<1&&
     wcx>room.x&&wcx<room.x+room.w&&Math.abs(wcx-mx)<110;
  }).sort((a,b)=>{
   const mid=(wall:typeof a)=>({x:(wall.a.x+wall.b.x)/2,
    y:(wall.a.y+wall.b.y)/2});
   const x=mid(a),y=mid(b);
   return dist(x.x,x.y,mx,my)-dist(y.x,y.y,mx,my);
  });
  // An entrance can occupy nearly all of a narrow vestibule facade.
  // In that case a legible panel goes on its adjacent wall, not in the
  // door opening or an unrelated hallway across the building.
  if(!spans.length)spans=site.walls.filter(wall=>{
   const length=dist(wall.a.x,wall.a.y,wall.b.x,wall.b.y);
   if(length<29)return false;
   const cx=(wall.a.x+wall.b.x)/2,cy=(wall.a.y+wall.b.y)/2;
   const v=Math.abs(wall.a.x-wall.b.x)<1;
   const onBoundary=v?
    (Math.abs(cx-room.x)<1||Math.abs(cx-room.x-room.w)<1)&&
      cy>room.y+8&&cy<room.y+room.h-8:
    (Math.abs(cy-room.y)<1||Math.abs(cy-room.y-room.h)<1)&&
      cx>room.x+8&&cx<room.x+room.w-8;
   return onBoundary&&dist(cx,cy,mx,my)<180;
  }).sort((a,b)=>{
   const center=(w:typeof a)=>({
    x:(w.a.x+w.b.x)/2,y:(w.a.y+w.b.y)/2});
   const x=center(a),y=center(b);
   return dist(x.x,x.y,mx,my)-dist(y.x,y.y,mx,my);
  });
  const add=(wall:typeof spans[number],kind:WallDetailKind,index:number)=>{
   const cx=(wall.a.x+wall.b.x)/2,cy=(wall.a.y+wall.b.y)/2;
   const wallVertical=Math.abs(wall.a.x-wall.b.x)<1;
   const nx=wallVertical?Math.sign(room.x+room.w/2-cx):0;
   const ny=wallVertical?0:Math.sign(room.y+room.h/2-cy);
   const width=kind==='exit-sign'?17:Math.min(36,
    dist(wall.a.x,wall.a.y,wall.b.x,wall.b.y)-10);
   details.push({id:room.id+':egress:'+door.id+':'+index,roomId:room.id,kind,
    x:cx+nx*5.3,y:cy+ny*5.3,
    height:kind==='exit-sign'?31:43,angle:Math.atan2(nx,ny),
    width,depth:kind==='exit-sign'?7:11});
  };
  if(spans.length)add(spans[0],'exit-sign',0);
  // A commercial entrance also gets a specific branded building panel,
  // never an irrelevant generic sign on a residential front door.
  if(door.id==='FRONT'&&
    ['retail','restaurant','office','garage','motel','clinic','utility',
     'warehouse'].includes(site.archetype??'')&&spans.length)
    add(spans[1]??spans[0],'business-sign',1);
 }
 return {...site,wallDetails:details};
}
