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
  const swept=(p:Pt)=>{
   const count=Math.max(10,Math.ceil(near(a.position,p)/3));
   return Array.from({length:count},(_,i)=>{
    const t=(i+1)/count;
    return {x:a.position.x+(p.x-a.position.x)*t,
      y:a.position.y+(p.y-a.position.y)*t};
   }).every(valid);
  };
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
       valid(p)&&swept(p))
       return {...a,routine:[{...a.position},p]};
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
