/** D3.10A offline witness: retail 31084 entry Vale's route and selected lane.
 * Run unchanged on before/after worktrees; no live gameplay instrumentation. */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,pointToSegment,doorLeafSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {routeWithSqueezeWorld} from '../src/breach-squeeze-route.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const r=n=>Math.round(n*100)/100;
const site=generateSite(31084,'standard',undefined,
 {mission:'intel'},{archetype:'retail'});
const quiet={...site,training:true,enemies:[],encounter:undefined};
const s=newSession(0,31084,'full-view',site.scale??'standard','intel',quiet,
 {enableCivilians:false});
try{
 const actors=team(s).slice(0,4),start=actors[0].p;
 const ranked=[...s.doors].filter(d=>d.kind!=='sliding'&&d.kind!=='shutter')
  .sort((a,b)=>distance(start,{x:(a.a.x+a.b.x)/2,y:(a.a.y+a.b.y)/2})-
   distance(start,{x:(b.a.x+b.b.x)/2,y:(b.a.y+b.b.y)/2})||
   a.id.localeCompare(b.id)).slice(0,12);
 let door=null;
 for(const candidate of ranked)if(planSquadEntry(s,candidate.id)){
  door=candidate;break;
 }
 if(!door)throw Error('no entry selected');
 const goals=actors.map(a=>({id:a.id,p:a.plan.find(n=>n.entryDoorId===door.id)?.p}));
 const vale=actors.find(a=>a.id==='vale'),goal=goals.find(x=>x.id==='vale').p;
 const world=sessionWorldGeometry(s),initial={
  chosenDoor:door.id,door:{a:door.a,b:door.b,hinge:door.hinge,
   swing:door.swing,kind:door.kind},goals,from:{...vale.p},
  goalBodyClear:bodyClear(goal,s.doors,OPERATOR_RADIUS,world),
  goalWorldPassable:world.passable(goal,OPERATOR_RADIUS)
 };
 toggling(s);
 const observations=[];
 for(let tick=0;tick<2700;tick++){
  stepSession(s,1/60);
  if((tick+1)%120!==0&&tick!==2699)continue;
  const nav=vale.nav[0]??null;
  observations.push({t:r(s.seconds),p:{...vale.p},
   remaining:r(distance(vale.p,goal)),nav,navGap:nav?r(distance(vale.p,nav)):null,
   blocked:r(vale.blockedTime),retry:vale.recoveryAttempts,
   motorPause:vale.motorPause,blocker:vale.lastBlocker,plan:vale.plan[0]?.kind??null,
   activeDoor:vale.doorTraversal?.doorId??null,
   speed:r(vale.velocity),
   navSwept:nav?sweptBodyClear(vale.p,nav,s.doors,OPERATOR_RADIUS,world):null});
 }
 const nearCover=world.cover.filter(o=>
   Math.abs(o.x-vale.p.x)<o.w/2+40&&
   Math.abs(o.y-vale.p.y)<o.h/2+40).map(o=>({
    id:o.id??null,fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h}));
 const nearWalls=world.walls.map((wall,i)=>({
   index:i,gap:r(pointToSegment(vale.p,wall)),wall}))
   .filter(x=>x.gap<45).sort((a,b)=>a.gap-b.gap).slice(0,8);
 const nearestDoors=s.doors.map(d=>({id:d.id,
   leafGap:r(pointToSegment(vale.p,doorLeafSegment(d))),
   open:d.open,fraction:r(d.openFraction??0)}))
   .sort((a,b)=>a.leafGap-b.leafGap).slice(0,5);
 console.log(JSON.stringify({initial,observations,nearCover,nearWalls,
  nearestDoors,finalRoute:routeWithSqueezeWorld(vale.p,goal,s.doors,world).slice(0,12),
  cancel:s.events.filter(e=>typeof e==='string'&&e.includes('ORDER CANCELLED'))},
  null,2));
}finally{activateSite(null);}
