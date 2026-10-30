/**
 * Build 085–088: one seeded architectural description for rules and renderers.
 * Every wall is explicitly cut around a real Door; no visual-only shortcuts.
 */
import {type Pt,type Segment,type Door,type Obstacle} from './breach-core.ts';
export type Room={id:string;x:number;y:number;w:number;h:number;
  kind:'room'|'hall';tone:number};
export type Site={
  seed:number;name:string;rooms:Room[];walls:Segment[];doors:Door[];
  cover:Obstacle[];entrance:Pt;spawn:Pt[];enemies:Pt[];
  objective:Pt;extract:Pt;roomCount:number;
};
const segment=(x:number,y:number,u:number,v:number):Segment=>
  ({a:{x,y},b:{x:u,y:v}});
export const seeded=(seed:number)=>{
  let n=seed>>>0;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
    return n/4294967296;};
};
const between=(r:()=>number,min:number,max:number)=>
  min+Math.floor(r()*(max-min+1));
export function generateSite(seed:number):Site{
  const rng=seeded(seed);
  const target=between(rng,3,6);
  const rows=target>4?3:2,cols=2;
  const x0=between(rng,91,123),x1=between(rng,315,356),x2=between(rng,557,585);
  const y0=between(rng,95,120),y2=between(rng,522,553);
  const y1=rows===2?between(rng,285,357):between(rng,240,270);
  const ys=rows===2?[y0,y1,y2]:[y0,y1,between(rng,380,421),y2];
  const xs=[x0,x1,x2];
  const cell=(c:number,r:number)=>r*cols+c;
  const rooms:Room[]=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const hall=(target%2===1&&r===Math.floor(rows/2)&&c===0);
    rooms.push({id:'R'+(cell(c,r)+1),x:xs[c],y:ys[r],
      w:xs[c+1]-xs[c],h:ys[r+1]-ys[r],
      kind:hall?'hall':'room',tone:between(rng,0,3)});
  }
  // Odd-sized sites have a real hall cell and target habitable rooms.
  const habitable=rooms.filter(room=>room.kind==='room');
  const walls:Segment[]=[],doors:Door[]=[];
  const appendWall=(a:Pt,b:Pt,doorPoint:Pt|null=null,
    id:string|null=null)=>{
    if(!doorPoint||!id){walls.push({a,b});return;}
    const vertical=Math.abs(a.x-b.x)<1;
    const half=29; // ~58 world-unit opening: enough for stacked operators.
    const pre=vertical?{x:a.x,y:doorPoint.y-half}:
      {x:doorPoint.x-half,y:a.y};
    const post=vertical?{x:a.x,y:doorPoint.y+half}:
      {x:doorPoint.x+half,y:a.y};
    walls.push({a,b:pre},{a:post,b});
    doors.push({id,a:pre,b:post,open:false,openedAt:-1});
  };
  // Perimeter with one actual exterior doorway on the lower wall.
  walls.push(segment(x0,y0,x2,y0),segment(x0,y0,x0,y2),
    segment(x2,y0,x2,y2));
  const entranceX=xs[between(rng,0,1)]+between(rng,65,92);
  const entry={x:entranceX,y:y2};
  appendWall({x:x0,y:y2},{x:x2,y:y2},entry,'FRONT');
  // A connected spanning tree of rooms: vertical chain in every column,
  // and one or more lateral cross-connectors. A random second lateral
  // crossing creates alternative routes through some compounds.
  let doorId=1;
  const offset=(lo:number,hi:number)=>
    rng()<.34?lo+between(rng,42,64):
      rng()<.5?hi-between(rng,42,64):(lo+hi)/2+between(rng,-21,21);
  for(let r=0;r<rows;r++){
    const y=offset(ys[r],ys[r+1]);
    // Always join the columns on at least one level; other levels
    // may be walls or secondary doors, but never disconnected islands.
    const openings=r===rows-1||rng()<.68;
    appendWall({x:x1,y:ys[r]},{x:x1,y:ys[r+1]},
      openings?{x:x1,y}:null,openings?'D'+doorId++:null);
  }
  for(let r=1;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x=offset(xs[c],xs[c+1]);
      appendWall({x:xs[c],y:ys[r]},{x:xs[c+1],y:ys[r]},
        {x,y:ys[r]},'D'+doorId++);
    }
  }
  const cover:Obstacle[]=[];
  for(const room of rooms){
    const count=room.kind==='hall'?between(rng,0,1):
      between(rng,1,room.w*room.h>38000?3:2);
    for(let j=0;j<count;j++){
      const w=between(rng,28,57),h=between(rng,20,39);
      let found=false;
      for(let tryNum=0;tryNum<22;tryNum++){
        const p={x:between(rng,room.x+49,room.x+room.w-49),
          y:between(rng,room.y+47,room.y+room.h-47)};
        if(doors.some(d=>Math.hypot(p.x-(d.a.x+d.b.x)/2,
          p.y-(d.a.y+d.b.y)/2)<67))continue;
        if(cover.some(o=>Math.abs(p.x-o.x)<(o.w+w)/2+27&&
          Math.abs(p.y-o.y)<(o.h+h)/2+24))continue;
        cover.push({...p,w,h,low:rng()<.61});found=true;break;
      }
      if(!found)break;
    }
  }
  const entrance={x:entry.x,y:y2+55};
  const spawn=[
    {x:entry.x-19,y:y2+46},{x:entry.x+19,y:y2+46},
    {x:entry.x-19,y:y2+73},{x:entry.x+19,y:y2+73},
  ];
  // The objective belongs to a distant interior room, not to a crate.
  const far=habitable.filter(room=>room.y<ys[Math.min(1,rows-1)]);
  const objectiveRoom=far[between(rng,0,far.length-1)]??habitable[0];
  const objective={x:objectiveRoom.x+objectiveRoom.w*.52,
    y:objectiveRoom.y+objectiveRoom.h*.50};
  const enemies:Pt[]=[];
  const count=between(rng,Math.max(2,target-1),Math.min(7,target+1));
  for(let i=0;i<count;i++){
    const candidates=habitable.filter(room=>room.y<ys[rows-1]||
      room.x+room.w/2>entry.x+75);
    const room=candidates[between(rng,0,candidates.length-1)];
    for(let trial=0;trial<35;trial++){
      const p={x:between(rng,room.x+34,room.x+room.w-34),
        y:between(rng,room.y+34,room.y+room.h-34)};
      if(cover.some(o=>Math.abs(p.x-o.x)<o.w/2+24&&
        Math.abs(p.y-o.y)<o.h/2+24))continue;
      if(enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<35))continue;
      enemies.push(p);break;
    }
  }
  return {seed,name:['CUTWOODS','MILL ANNEX','TOLL HOUSE','RELAY SITE',
    'SERVICE DEPOT','FARMSTATION'][seed%6],rooms,walls,doors,cover,
    entrance,spawn,enemies,objective,extract:{x:entry.x,y:y2+115},
    roomCount:habitable.length};
}
