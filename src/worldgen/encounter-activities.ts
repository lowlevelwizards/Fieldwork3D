/** Initial facing/readiness reflects actual furnished space. */
import type {Site} from '../breach-site.ts';
import type {EncounterActorSpec,EncounterPremise,EncounterActivity,EncounterReadiness} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const facing=(from:{x:number;y:number},to:{x:number;y:number},fallback:number)=>
 dist(from,to)>8?Math.atan2(to.y-from.y,to.x-from.x):fallback;
const desk=new Set(['desk','reception-desk','transaction-counter','checkout','control-panel']);
const rest=new Set(['chair','office-chair','bar-stool','sofa','armchair','bed','bench','patio-chair']);
const work=new Set(['workbench','vehicle-lift','commercial-range','prep-table','packing-station',
 'counter','stove','generator','tool-chest']);
export function assignEncounterActivities(site:Site,actors:EncounterActorSpec[],
 premise:EncounterPremise,seed:number):EncounterActorSpec[]{
 const rng=encounterRng(seed,6);
 const prepared=premise==='defensive'||premise==='guarded';
 const alert=premise==='incident'||premise==='disturbance';
 return actors.map(a=>{
  const p=a.position;
  const room=site.rooms.find(r=>r.kind==='room'&&p.x>=r.x&&p.x<=r.x+r.w&&
   p.y>=r.y&&p.y<=r.y+r.h);
  const furniture=site.cover.filter(c=>c.fixture&&room&&
    c.x>=room.x&&c.x<=room.x+room.w&&c.y>=room.y&&c.y<=room.y+room.h)
   .sort((b,c)=>dist(p,b)-dist(p,c));
  const near=furniture.find(x=>dist(p,x)<90);
  const fixture=near?.fixture??'';
  let activity:EncounterActivity='idle';
  let readiness:EncounterReadiness=prepared?'prepared':alert?'suspicious':'relaxed';
  let heading=a.heading;
  if(a.role==='sentry'||a.role==='lookout'){
   activity='watching';readiness=prepared?'prepared':'attentive';
   const door=site.doors.slice().sort((b,c)=>{
    const pb={x:(b.a.x+b.b.x)/2,y:(b.a.y+b.b.y)/2};
    const pc={x:(c.a.x+c.b.x)/2,y:(c.a.y+c.b.y)/2};
    return dist(p,pb)-dist(p,pc);
   })[0];
   if(door)heading=facing(p,{x:(door.a.x+door.b.x)/2,
     y:(door.a.y+door.b.y)/2},heading);
  }else{
   if(desk.has(fixture)||work.has(fixture))activity='working';
   else if(rest.has(fixture))activity=fixture==='bed'?'resting':'seated';
   else if(['rack','shelf','gondola-shelf','bookcase','filing-cabinet'].includes(fixture))
    activity='inspecting';
   else if(rng()<.22)activity='talking';
   if(near)heading=facing(p,near,heading);
   if(premise==='hideout')readiness=rng()<.25?'relaxed':'attentive';
  }
  return {...a,activity,readiness,heading};
 });
}
