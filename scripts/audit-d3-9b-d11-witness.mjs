/** D3.9B forensic witness: townhouse seed 31058 authored MOVE.
 * Recreates the frozen D3.6 corpus setup, changing NO motor or orders.
 * Compare the pre-A and D3.9A worktrees with exactly this same file.
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,stepSession,toggling} from '../src/breach-game.ts';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {MovementQualitySurvey} from '../src/breach-movement-quality.ts';

const seed=31058,scale='standard',archetype='townhouse';
const site=generateSite(seed,scale,undefined,{mission:'intel'},{archetype});
const quiet={...site,training:true,enemies:[],encounter:undefined};
const s=newSession(0,seed,'full-view',site.scale??'small','intel',quiet,
 {enableCivilians:false});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round=n=>Math.round(n*100)/100;
try{
 const actors=team(s).slice(0,4);
 const points=site.rooms.filter(r=>r.kind==='room').flatMap(r=>[
  {x:r.x+r.w*.5,y:r.y+r.h*.5},
  {x:r.x+r.w*.35,y:r.y+r.h*.5},
  {x:r.x+r.w*.65,y:r.y+r.h*.5}
 ]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 const goals=new Map();
 for(const actor of actors){
  const ranked=[...points].sort((a,b)=>
   dist(b,actor.p)-dist(a,actor.p)||a.x-b.x||a.y-b.y);
  for(const target of ranked){
   if([...goals.values()].some(g=>dist(target,g)<26))continue;
   if(!planMove(s,actor.id,target))continue;
   goals.set(actor.id,{...target});break;
  }
 }
 if(goals.size!==4)throw Error('expected four authored MOVE orders');
 const stats=new MovementQualitySurvey(actors,goals);
 const time=[];
 const transitions=[];
 const lastPause=new Map(actors.map(a=>[a.id,a.motorPause]));
 const lastDoor=new Map(s.doors.map(d=>[d.id,d.open]));
 const sample=(tick)=>{
  const outcome=stats.finish(actors);
  time.push({seconds:round(tick/60),
   arrivals:outcome.arrivals,
   doors:s.doors.filter(d=>d.open||d.id==='D11')
    .map(d=>({id:d.id,open:d.open,
     fraction:round(d.openFraction??0),angularVelocity:round(d.angularVelocity??0),
     locked:!!d.locked})).slice(0,18),
   actors:actors.map(a=>{
    const goal=goals.get(a.id);
    const track=outcome.details.find(x=>x.actor===a.id);
    return {id:a.id,position:{x:round(a.p.x),y:round(a.p.y)},
     goal,remaining:round(dist(a.p,goal)),arrived:dist(a.p,goal)<16,
     cumulativeDistance:track?.distance,blockedSeconds:track?.blockedSeconds,
     passageWaitSeconds:track?.passageWaitSeconds,retries:track?.retries,
     longestStillSeconds:track?.longestStillSeconds,velocity:round(a.velocity),
     motorPause:a.motorPause,blockedTime:round(a.blockedTime),lastBlocker:a.lastBlocker,
     doorTraversal:a.doorTraversal?{doorId:a.doorTraversal.doorId,
      phase:a.doorTraversal.phase,maneuver:a.doorTraversal.maneuver,
      attempts:a.doorTraversal.maneuverAttempts}:null,
     hand:a.doorHandContact?.releasedAt===null?a.doorHandContact.doorId:null,
     nextNav:a.nav[0]??null,navCount:a.nav.length,
     plan:a.plan[0]?{id:a.plan[0].id,kind:a.plan[0].kind}:null};
   })});
 };
 sample(0);toggling(s);
 for(let tick=1;tick<=720;tick++){
  stepSession(s,1/60);
  stats.sample(actors,1/60);
  for(const a of actors){
   if(a.motorPause!==lastPause.get(a.id)&&transitions.length<80)
    transitions.push({t:round(tick/60),id:a.id,
     from:lastPause.get(a.id),to:a.motorPause,
     pos:{x:round(a.p.x),y:round(a.p.y)},
     door:a.doorTraversal?.doorId??null});
   lastPause.set(a.id,a.motorPause);
  }
  for(const d of s.doors){
   if(d.open!==lastDoor.get(d.id)&&transitions.length<80)
    transitions.push({t:round(tick/60),door:d.id,open:d.open});
   lastDoor.set(d.id,d.open);
  }
  if(tick>=240&&tick<=720&&tick%30===0){
   const d=s.doors.find(x=>x.id==='D11');
   if(d){
    const leaf=doorLeafSegment(d);
    time.push({seconds:round(tick/60),D11:{
      open:d.open,locked:d.locked,hinge:d.hinge,swing:d.swing,
      fraction:round(d.openFraction??0),pushTarget:round(d.pushTarget??0),
      angularVelocity:round(d.angularVelocity??0),a:d.a,b:d.b,
      leaf,openingOwner:null
     },
     actors:actors.filter(a=>a.id==='rook'||a.id==='moss').map(a=>({
      id:a.id,p:{x:round(a.p.x),y:round(a.p.y)},
      distanceFromLeaf:round(pointToSegment(a.p,leaf)),
      squeeze:a.squeeze,squeezeTime:round(a.squeezeTime),squeezeYaw:round(a.squeezeYaw),
      heading:round(a.heading),velocity:round(a.velocity),
      motorPause:a.motorPause,actionTimer:round(a.actionTimer),
      blockedTime:round(a.blockedTime),lastBlocker:a.lastBlocker,
      nav:a.nav.slice(0,3),goal:goals.get(a.id),
      episode:a.doorTraversal?{doorId:a.doorTraversal.doorId,
       phase:a.doorTraversal.phase,maneuver:a.doorTraversal.maneuver,
       attempts:a.doorTraversal.maneuverAttempts,waypoints:a.doorTraversal.waypoints}:null,
      grip:a.doorHandContact?.releasedAt===null?a.doorHandContact:null
     }))});
   }
  }
  if(actors.every(a=>!a.plan.length))break;
 }
 const final=stats.finish(actors);
 console.log(JSON.stringify({seed,archetype,mode:'authored',
  checkpoints:time,transitions,final},null,2));
}finally{activateSite(null)}
