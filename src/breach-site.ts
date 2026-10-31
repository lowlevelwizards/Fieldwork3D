/**
 * Build 085–088: one seeded architectural description for rules and renderers.
 * Every wall is explicitly cut around a real Door; no visual-only shortcuts.
 */
import {type Pt,type Segment,type Door,type Obstacle,
  pointToSegment} from './breach-core.ts';
import {generateJunctionSite} from './breach-junction-site.ts';
import {applyArchetype} from './breach-archetypes.ts';
import {appendArchitecturalWing} from './worldgen/architectural-wings.ts';
import {expandProperty} from './worldgen/expanded-property.ts';
import {compileArchitecturalSite} from './worldgen/architectural-compiler.ts';
export type Room={id:string;zoneId?:string;x:number;y:number;w:number;h:number;
  kind:'room'|'hall';tone:number;purpose?:string};
export type BuildingArchetype='house'|'townhouse'|'apartment'|'retail'|'office'|'garage'|'warehouse'|'restaurant'|'motel'|'utility'|'clinic';
export type ExteriorZone={id:string;kind:'yard'|'patio'|'driveway'|'service'|'garden'|'parking';x:number;y:number;w:number;h:number};
export type WideOpening={id:string;a:Pt;b:Pt;kind:'arch'|'wide'};
export type EnvironmentCondition='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
export type WindowOpening={id:string;x:number;y:number;width:number;vertical:boolean};
export type WorldBounds={minX:number;minY:number;maxX:number;maxY:number};
export type SiteScale='standard'|'expanded';
export type Site={
  /** Authored semantic programs bypass index-based purpose assignment. */
  programLocked?:boolean;
  planFamily?:string;
  scale?:SiteScale;
  /** Explicit playable world envelope; legacy maps default to 640 × 740. */
  bounds?:WorldBounds;
  seed:number;name:string;rooms:Room[];walls:Segment[];doors:Door[];
  /** Open hall-to-hall transitions need no obstructing door leaf. */
  openHallLinks?:number;
  archetype?:BuildingArchetype;
  windows?:WindowOpening[];
  enemyHeadings?:number[];
  scenarioStyle?:'routine'|'guarded'|'disrupted';
  condition?:EnvironmentCondition;
  dressing?:import('./worldgen/environment-dresser.ts').DecorativeDetail[];
  openings?:WideOpening[];
  exteriorZones?:ExteriorZone[];
  cover:Obstacle[];entrance:Pt;spawn:Pt[];enemies:Pt[];
  objective:Pt;extract:Pt;roomCount:number;
  layout:'office'|'workshop'|'corridor'|'courtyard';
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
export function generateSite(seed:number,scale:SiteScale='standard'):Site{
  if(scale==='expanded'&&seed%4!==0){
    // Architectural compiler is opt-in with deterministic legacy fallback.
    try{return applyArchetype(compileArchitecturalSite(
      (['house','townhouse','apartment','retail','office','garage',
        'warehouse','restaurant','motel','utility','clinic'] as const)
         [(seed>>>0)%11],seed),seed);}
    catch{/* Older generator remains available when a grammar cannot compile. */}
  }
  if(seed%5===0){
    const property=appendArchitecturalWing(generateJunctionSite(seed),seed);
    return applyArchetype(scale==='expanded'?expandProperty(property,seed):property,seed);
  }
  const rng=seeded(seed);
  const target=between(rng,3,6);
  const layout=(['office','workshop','corridor','courtyard'] as const)[seed%4];
  const cols=target>=5&&layout==='office'?3:2;
  const rows=cols===3?2:target>4?3:2;
  const x0=between(rng,91,123),x1=cols===3?between(rng,242,268):
    between(rng,315,356),x2=cols===3?between(rng,401,429):
    between(rng,557,585),x3=cols===3?between(rng,557,585):x2;
  const xs=cols===3?[x0,x1,x2,x3]:[x0,x1,x2];
  const y0=between(rng,95,120),y2=between(rng,522,553);
  const y1=rows===2?between(rng,285,357):between(rng,240,270);
  const ys=rows===2?[y0,y1,y2]:[y0,y1,between(rng,380,421),y2];
  const cell=(c:number,r:number)=>r*cols+c;
  const rooms:Room[]=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const hall=target%2===1&&
      (layout==='corridor'?c===0&&r===Math.floor(rows/2):
       layout==='courtyard'?c===1&&r===rows-1:
       r===Math.floor(rows/2)&&c===0);
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
    const half=24; // ~48 world-unit opening, physically passable for one operator.
    const pre=vertical?{x:a.x,y:doorPoint.y-half}:
      {x:doorPoint.x-half,y:a.y};
    const post=vertical?{x:a.x,y:doorPoint.y+half}:
      {x:doorPoint.x+half,y:a.y};
    walls.push({a,b:pre},{a:post,b});
    doors.push({id,a:pre,b:post,open:false,openedAt:-1});
  };
  // Perimeter with one actual exterior doorway on the lower wall.
  // Some sites provide a genuine alternative rear or side entrance.
  const farX=xs[cols];
  appendWall({x:x0,y:y0},{x:farX,y:y0},
    layout==='courtyard'?{x:(x1+farX)/2,y:y0}:null,
    layout==='courtyard'?'REAR':null);
  walls.push(segment(x0,y0,x0,y2));
  appendWall({x:farX,y:y0},{x:farX,y:y2},
    layout==='workshop'?{x:farX,y:(y1+y2)/2}:null,
    layout==='workshop'?'SERVICE':null);
  const entranceX=cols===2?
    xs[between(rng,0,1)]+between(rng,65,92):
    xs[between(rng,0,cols-1)]+
      between(rng,Math.floor((xs[1]-xs[0])*.38),
        Math.floor((xs[1]-xs[0])*.58));
  const entry={x:entranceX,y:y2};
  appendWall({x:x0,y:y2},{x:farX,y:y2},entry,'FRONT');
  // A connected spanning tree of rooms: vertical chain in every column,
  // and one or more lateral cross-connectors. A random second lateral
  // crossing creates alternative routes through some compounds.
  let doorId=1;
  const offset=(lo:number,hi:number)=>
    rng()<.34?lo+between(rng,42,64):
      rng()<.5?hi-between(rng,42,64):(lo+hi)/2+between(rng,-21,21);
  for(let c=1;c<cols;c++)for(let r=0;r<rows;r++){
    const y=offset(ys[r],ys[r+1]);
    // The final row always connects every column horizontally.
    const openings=r===rows-1||rng()<.68;
    appendWall({x:xs[c],y:ys[r]},{x:xs[c],y:ys[r+1]},
      openings?{x:xs[c],y}:null,openings?'D'+doorId++:null);
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
      layout==='workshop'?between(rng,1,4):
      layout==='corridor'?between(rng,0,2):
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
  let objective={x:objectiveRoom.x+objectiveRoom.w*.52,
    y:objectiveRoom.y+objectiveRoom.h*.50};
  // A mission objective must never spawn inside blocking furniture.
  if(cover.some(o=>Math.abs(objective.x-o.x)<o.w/2+23&&
      Math.abs(objective.y-o.y)<o.h/2+23)){
    const slots=[
      {x:objectiveRoom.x+43,y:objectiveRoom.y+43},
      {x:objectiveRoom.x+objectiveRoom.w-43,y:objectiveRoom.y+43},
      {x:objectiveRoom.x+43,y:objectiveRoom.y+objectiveRoom.h-43},
      {x:objectiveRoom.x+objectiveRoom.w-43,
        y:objectiveRoom.y+objectiveRoom.h-43},
    ];
    const available=slots.find(p=>cover.every(o=>
      Math.abs(p.x-o.x)>o.w/2+20||
      Math.abs(p.y-o.y)>o.h/2+20));
    if(available)objective=available;
  }
  // Objectives are validated against every actual wall and furnishing;
  // a room-center candidate can be near a partition in a three-column site.
  const isFree=(p:Pt)=>walls.every(w=>pointToSegment(p,w)>=15)&&
    cover.every(o=>Math.abs(p.x-o.x)>=o.w/2+12||
      Math.abs(p.y-o.y)>=o.h/2+12);
  if(!isFree(objective)){
    const candidates:Pt[]=[];
    for(let y=objectiveRoom.y+27;y<objectiveRoom.y+objectiveRoom.h-27;y+=18)
      for(let x=objectiveRoom.x+27;x<objectiveRoom.x+objectiveRoom.w-27;x+=18)
        candidates.push({x,y});
    candidates.sort((a,b)=>
      Math.hypot(a.x-objective.x,a.y-objective.y)-
      Math.hypot(b.x-objective.x,b.y-objective.y));
    objective=candidates.find(isFree)??objective;
  }
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
  const property=appendArchitecturalWing({seed,name:['CUTWOODS','MILL ANNEX','TOLL HOUSE','RELAY SITE',
    'SERVICE DEPOT','FARMSTATION'][seed%6],rooms,walls,doors,cover,
    entrance,spawn,enemies,objective,extract:{x:entry.x,y:y2+115},
    roomCount:habitable.length,layout},seed);
  return applyArchetype(scale==='expanded'?expandProperty(property,seed):property,seed);
}
