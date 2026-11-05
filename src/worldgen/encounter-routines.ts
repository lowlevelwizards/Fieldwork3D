/** Cheap local activity journeys from validated spawns. No A* at generation;
 * the runtime motor verifies any movement before carrying it out. */
import type {Site} from '../breach-site.ts';
import type {EncounterActorSpec} from './encounter-types.ts';
import {pointToSegment,type Pt} from '../breach-core.ts';
import {encounterRng} from './encounter-rng.ts';
const near=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const workStations=new Set(['desk','reception-desk','transaction-counter',
 'checkout','control-panel','workbench','packing-station','prep-table',
 'counter','stove','tool-chest']);
const inspectStations=new Set(['shelf','rack','gondola-shelf','bookcase',
 'filing-cabinet','storage-shelf','display-rack']);
/** Stand near a real fixture, not inside it. The motor still verifies
 * every route at runtime; no hidden path or scripted teleport is created. */
const fixtureStops=(c:{x:number;y:number;w:number;h:number}):Pt[]=>[
 {x:c.x-c.w/2-19,y:c.y},{x:c.x+c.w/2+19,y:c.y},
 {x:c.x,y:c.y-c.h/2-19},{x:c.x,y:c.y+c.h/2+19}
];
export function assignEncounterRoutines(site:Site,actors:EncounterActorSpec[],
 seed:number):EncounterActorSpec[]{
 const rng=encounterRng(seed,7);
 return actors.map(a=>{
  const patrol=a.role==='patrol';
  if((a.readiness!=='relaxed'&&!patrol)||
     (!patrol&&!['working','inspecting','idle'].includes(a.activity))||
     (!patrol&&rng()>.38))return a;
  const room=site.rooms.find(r=>r.kind==='room'&&a.position.x>=r.x&&
   a.position.x<=r.x+r.w&&a.position.y>=r.y&&a.position.y<=r.y+r.h);
  if(!room)return a;
  const choices=[{x:38,y:0},{x:-38,y:0},{x:0,y:38},{x:0,y:-38},
   {x:50,y:25},{x:-50,y:-25}];
  const offset=Math.floor(rng()*choices.length);
  const valid=(p:Pt)=>p.x>room.x+20&&p.y>room.y+20&&
   p.x<room.x+room.w-20&&p.y<room.y+room.h-20&&
   !site.walls.some(w=>pointToSegment(p,w)<12)&&
   !site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+10&&
    Math.abs(p.y-c.y)<c.h/2+10)&&
   !site.doors.some(d=>near(p,{x:(d.a.x+d.b.x)/2,
    y:(d.a.y+d.b.y)/2})<35);
  const sweptFrom=(from:Pt,p:Pt)=>{
   const count=Math.max(10,Math.ceil(near(from,p)/3));
   return Array.from({length:count},(_,i)=>{
    const t=(i+1)/count;
    return {x:from.x+(p.x-from.x)*t,
      y:from.y+(p.y-from.y)*t};
   }).every(valid);
  };
  const swept=(p:Pt)=>sweptFrom(a.position,p);
  // A patrol checks a real accessible interior doorway from a standoff
  // position, never the center of a physical door leaf. No contact is
  // invented and the runtime motor retains the right to reject the route.
  if(patrol){
   const posts=site.doors.map(door=>({
    x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2
   })).filter(p=>p.x>=room.x-7&&p.y>=room.y-7&&
     p.x<=room.x+room.w+7&&p.y<=room.y+room.h+7&&
     near(a.position,p)>50&&near(a.position,p)<170)
    .sort((u,v)=>near(a.position,u)-near(a.position,v));
   const offset=posts.length?Math.floor(rng()*posts.length):0;
   for(let i=0;i<posts.length;i++){
    const door=posts[(i+offset)%posts.length];
    const len=near(a.position,door);
    const p={x:door.x+(a.position.x-door.x)/len*48,
      y:door.y+(a.position.y-door.y)/len*48};
    if(near(a.position,p)>20&&valid(p)&&swept(p)){
     const routine=[{...a.position},p];
     // A second real observation point is optional; never jump across
     // partition walls or through a door swing to manufacture variety.
     for(let j=1;j<posts.length&&routine.length<3;j++){
      const other=posts[(i+offset+j)%posts.length];
      const len2=near(a.position,other);
      const next={x:other.x+(a.position.x-other.x)/len2*48,
        y:other.y+(a.position.y-other.y)/len2*48};
      if(near(p,next)>32&&valid(next)&&sweptFrom(p,next))
       routine.push(next);
     }
     return {...a,routine};
    }
   }
  }
  // Ordinary work/inspection actors can make a local journey to an
  // ACTUAL work surface or display. Keep it within the existing room and
  // physically sample the complete segment; reject furniture/wall clips.
  const stations=a.activity==='working'?workStations:
    a.activity==='inspecting'?inspectStations:null;
  if(stations){
   const nearby=site.cover.filter(c=>stations.has(c.fixture??'')&&
     c.x>room.x&&c.x<room.x+room.w&&c.y>room.y&&c.y<room.y+room.h&&
     near(a.position,{x:c.x,y:c.y})>44&&
     near(a.position,{x:c.x,y:c.y})<135)
     .sort((u,v)=>near(a.position,{x:u.x,y:u.y})-
       near(a.position,{x:v.x,y:v.y}));
   const begin=nearby.length?Math.floor(rng()*nearby.length):0;
   for(let i=0;i<nearby.length;i++){
    const stops=fixtureStops(nearby[(i+begin)%nearby.length]);
    const turn=Math.floor(rng()*stops.length);
    for(let j=0;j<stops.length;j++){
     const p=stops[(j+turn)%stops.length];
     if(near(a.position,p)>20&&near(a.position,p)<150&&
       valid(p)&&swept(p)){
       const routine=[{...a.position},p];
       // Only actual *different* workstations justify additional stops.
       // Each consecutive leg is sampled for the same physical clearance.
       for(let n=1;n<nearby.length&&routine.length<4&&n<4;n++){
        const fixture=nearby[(i+begin+n)%nearby.length];
        const current=routine[routine.length-1];
        const next=fixtureStops(fixture).find(q=>
          near(current,q)>30&&near(current,q)<180&&
          valid(q)&&sweptFrom(current,q));
        if(next)routine.push(next);
       }
       return {...a,routine};
      }
    }
   }
  }
  for(let i=0;i<choices.length;i++){
   const c=choices[(i+offset)%choices.length];
   const p={x:a.position.x+c.x,y:a.position.y+c.y};
   if(valid(p)&&swept(p))
    return {...a,routine:[{...a.position},p]};
  }
  return a;
 });
}
