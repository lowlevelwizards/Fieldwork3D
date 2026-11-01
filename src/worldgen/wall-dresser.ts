/** MAP 09: deterministic, nonblocking attachments to actual wall segments. */
import {type Site,seeded} from '../breach-site.ts';
export type WallDetailKind='poster'|'picture'|'noticeboard'|'light-switch'|
 'electrical-box'|'breaker-panel'|'exit-sign';
export type WallDetail={
 id:string;roomId:string;kind:WallDetailKind;
 x:number;y:number;height:number;angle:number;width:number;depth:number;
};
const decor:Record<string,readonly WallDetailKind[]>={
 living:['picture','light-switch'],bedroom:['picture','light-switch'],
 guest:['picture','light-switch'],studio:['poster','light-switch'],
 kitchen:['picture','light-switch'],dining:['picture','light-switch'],
 bathroom:['light-switch'],office:['noticeboard','light-switch'],
 meeting:['noticeboard','light-switch'],reception:['noticeboard','light-switch'],
 waiting:['poster','light-switch'],exam:['poster','light-switch'],
 treatment:['poster','light-switch'],sales:['poster','exit-sign'],
 checkout:['poster','light-switch'],storage:['electrical-box'],
 loading:['exit-sign','electrical-box'],bay:['electrical-box','light-switch'],
 workshop:['electrical-box','breaker-panel'],equipment:['breaker-panel','electrical-box'],
 control:['breaker-panel','electrical-box'],aisle:['exit-sign'],
 hallway:['exit-sign','light-switch'],lobby:['noticeboard','exit-sign'],
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
    kind==='exit-sign'?17:Math.min(26,wall.length-14);
   const height=kind==='light-switch'?17:kind==='exit-sign'?31:
     kind==='electrical-box'||kind==='breaker-panel'?21:25;
   const shift=5.3;
   details.push({id:room.id+':wall:'+i,roomId:room.id,kind,
     x:wall.mx+wall.nx*shift,y:wall.my+wall.ny*shift,
     height,angle:Math.atan2(wall.nx,wall.ny),
     width,depth:kind==='light-switch'?3:kind==='exit-sign'?7:kind==='breaker-panel'?19:16});
  }
 }
 return {...site,wallDetails:details};
}
