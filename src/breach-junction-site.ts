/** Build 141F: corridor-first architectural graph generator.
 * Real long hall cells, L/T/4-way junctions, optional loops and nonuniform
 * room dimensions. Every wall, door and furniture footprint is authoritative. */
import {pointToSegment,type Door,type Segment,type Obstacle,type Pt}
  from './breach-core.ts';
import type {Site,Room} from './breach-site.ts';
import {ordinaryDoorOpeningWidth} from './breach-door-proportions.ts';
const seg=(x:number,y:number,u:number,v:number):Segment=>
 ({a:{x,y},b:{x:u,y:v}});
const length=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const patterns=[
  {name:'LONG HALL',hall:[1,4,7]},
  {name:'L-JUNCTION',hall:[1,4,5]},
  {name:'T-JUNCTION',hall:[3,4,5,7]},
  {name:'FOUR-WAY',hall:[1,3,4,5,7]},
  {name:'INTERCONNECTED',hall:[1,3,4,5,7]},
] as const;
export function generateJunctionSite(seed:number):Site{
  let n=(seed^0x78abc01)>>>0;
  const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
    return n/4294967296;};
  const integer=(min:number,max:number)=>
    min+Math.floor(rand()*(max-min+1));
  const variant=patterns[Math.abs(Math.floor(seed/5))%patterns.length];
  const xs=[integer(90,112),integer(266,279),integer(342,355),integer(560,582)];
  const ys=[integer(96,113),integer(262,275),integer(342,355),integer(525,550)];
  const rooms:Room[]=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const index=row*3+col;
    rooms.push({id:'R'+(index+1),x:xs[col],y:ys[row],
      w:xs[col+1]-xs[col],h:ys[row+1]-ys[row],
      kind:(variant.hall as readonly number[]).includes(index)?
        'hall':'room',tone:integer(0,3)});
  }
  const walls:Segment[]=[],doors:Door[]=[];
  const append=(boundary:Segment,id:string|null)=>{
    if(!id){walls.push(boundary);return;}
    const {a,b}=boundary,vertical=Math.abs(b.x-a.x)<.01;
    const span=length(a,b),half=ordinaryDoorOpeningWidth(id)/2;
    const offset=(rand()-.5)*Math.min(16,Math.max(0,span-2*half-14));
    const middle=vertical?{x:a.x,y:(a.y+b.y)/2+offset}:
      {x:(a.x+b.x)/2+offset,y:a.y};
    const near=vertical?{x:middle.x,y:middle.y-half}:
      {x:middle.x-half,y:middle.y};
    const far=vertical?{x:middle.x,y:middle.y+half}:
      {x:middle.x+half,y:middle.y};
    walls.push({a,b:near},{a:far,b});
    doors.push({id,a:near,b:far,open:false,openedAt:-1});
  };
  const x0=xs[0],y0=ys[0],y2=ys[3],x3=xs[3],frontX=(xs[1]+xs[2])/2;
  walls.push(seg(x0,y0,x3,y0),seg(x0,y0,x0,y2),
    seg(x3,y0,x3,y2));
  append(seg(x0,y2,x3,y2),'FRONT');
  // The bottom perimeter opening is cut at the central corridor's axis.
  // Replace FRONT's center opening only when the generic append placed it
  // halfway across the building rather than on the center strip.
  const front=doors[0],frontMid=(front.a.x+front.b.x)/2;
  if(Math.abs(frontMid-frontX)>4){
    walls.splice(walls.length-2,2);
    doors.pop();
    const half=ordinaryDoorOpeningWidth('FRONT')/2;
    walls.push(seg(x0,y2,frontX-half,y2),
      seg(frontX+half,y2,x3,y2));
    doors.push({id:'FRONT',a:{x:frontX-half,y:y2},
      b:{x:frontX+half,y:y2},open:false,openedAt:-1});
  }
  // The first connections are architectural preferences. A union-find
  // repair pass guarantees all cells remain connected, even for L-shapes.
  type Edge={a:number;b:number;wall:Segment;kind:'hall'|'door'|'wall'};
  const edges:Edge[]=[];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){
    const index=r*3+c;
    if(c<2)edges.push({a:index,b:index+1,
      wall:seg(xs[c+1],ys[r],xs[c+1],ys[r+1]),kind:'wall'});
    if(r<2)edges.push({a:index,b:index+3,
      wall:seg(xs[c],ys[r+1],xs[c+1],ys[r+1]),kind:'wall'});
  }
  const parent=rooms.map((_,i)=>i);
  const find=(x:number):number=>{
    let i=x;while(parent[i]!==i)i=parent[i];
    return i;
  };
  const connect=(a:number,b:number)=>{parent[find(a)]=find(b);};
  for(const edge of edges){
    const hallA=rooms[edge.a].kind==='hall',
      hallB=rooms[edge.b].kind==='hall';
    if(hallA&&hallB){edge.kind='hall';connect(edge.a,edge.b);}
    else if(hallA||hallB||rand()<(variant.name==='INTERCONNECTED'?.38:.14)){
      edge.kind='door';connect(edge.a,edge.b);
    }
  }
  for(const edge of edges)if(edge.kind==='wall'&&find(edge.a)!==find(edge.b)){
    edge.kind='door';connect(edge.a,edge.b);
  }
  // A few secondary loops provide real alternate approaches, not a tree.
  if(variant.name==='INTERCONNECTED')
    for(const edge of edges)if(edge.kind==='wall'&&rand()<.40)
      edge.kind='door';
  let id=1;
  for(const edge of edges){
    if(edge.kind==='hall')continue;
    append(edge.wall,edge.kind==='door'?'D'+id++:null);
  }
  const cover:Obstacle[]=[];
  const blocked=(p:Pt,clearance:number)=>walls.some(w=>
    pointToSegment(p,w)<clearance)||
    cover.some(o=>Math.abs(p.x-o.x)<o.w/2+clearance&&
      Math.abs(p.y-o.y)<o.h/2+clearance);
  for(const room of rooms){
    const count=room.kind==='hall'||room.w<100||room.h<95?0:
      integer(1,room.w*room.h>33000?3:2);
    for(let j=0;j<count;j++)for(let attempt=0;attempt<20;attempt++){
      const w=integer(22,Math.min(54,room.w-50));
      const h=integer(18,Math.min(35,room.h-50));
      const p={x:integer(room.x+28,room.x+room.w-28),
        y:integer(room.y+28,room.y+room.h-28)};
      if(blocked(p,Math.max(w,h)/2+18))continue;
      if(doors.some(door=>length(p,{x:(door.a.x+door.b.x)/2,
        y:(door.a.y+door.b.y)/2})<65))continue;
      cover.push({...p,w,h,low:rand()<.58});break;
    }
  }
  const entry={x:frontX,y:y2};
  const entrance={x:frontX,y:y2+54};
  const spawn=[{x:frontX-17,y:y2+45},{x:frontX+17,y:y2+45},
    {x:frontX-17,y:y2+73},{x:frontX+17,y:y2+73}];
  const habitable=rooms.filter(r=>r.kind==='room');
  const center=(r:Room)=>({x:r.x+r.w/2,y:r.y+r.h/2});
  const farRooms=habitable.slice().sort((a,b)=>
    length(center(b),entry)-length(center(a),entry));
  const destination=farRooms[0]??rooms[0];
  const free=(p:Pt)=>p.x>=x0+16&&p.x<=x3-16&&
    p.y>=y0+16&&p.y<=y2-16&&!blocked(p,17);
  const slots=(room:Room)=>{
    const points:Pt[]=[];
    for(let y=room.y+29;y<room.y+room.h-24;y+=15)
      for(let x=room.x+29;x<room.x+room.w-24;x+=15)
        if(free({x,y}))points.push({x,y});
    return points;
  };
  let objective=slots(destination).sort((a,b)=>
    length(a,center(destination))-length(b,center(destination)))[0]??
    center(destination);
  if(!free(objective))objective={x:destination.x+33,y:destination.y+33};
  const enemies:Pt[]=[];
  const count=integer(3,Math.min(7,habitable.length+1));
  for(let i=0;i<count;i++){
    const room=farRooms[i%farRooms.length];
    const candidates=slots(room).filter(p=>
      length(p,entry)>100&&enemies.every(e=>length(e,p)>36));
    if(candidates.length)enemies.push(candidates[integer(0,candidates.length-1)]);
  }
  return {seed,name:variant.name,rooms,walls,doors,cover,
    entrance,spawn,enemies,objective,extract:{x:frontX,y:y2+115},
    roomCount:habitable.length,layout:'corridor',
    openHallLinks:edges.filter(edge=>edge.kind==='hall').length};
}
