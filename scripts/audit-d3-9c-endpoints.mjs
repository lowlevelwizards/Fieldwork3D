/** C2/C3 read-only endpoint witness, using exact generated map Sessions. */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {diagnoseMovement} from '../src/breach-nav-diagnostics.ts';
import {routeWithSqueezeWorld} from '../src/breach-squeeze-route.ts';
const examples=[{seed:31045,kind:'entry',site:'house',id:'ash'},
 {seed:31084,kind:'entry',site:'retail',id:'rook'},
 {seed:31149,kind:'authored',site:'motel',id:'ash'}];
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),r=x=>Math.round(x*100)/100;
function planFour(s,actors,site){
 const candidates=site.rooms.filter(x=>x.kind==='room').flatMap(x=>[
  {x:x.x+x.w*.5,y:x.y+x.h*.5},
  {x:x.x+x.w*.35,y:x.y+x.h*.5},
  {x:x.x+x.w*.65,y:x.y+x.h*.5}
 ]).filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.y));
 const goals=new Map();
 for(const actor of actors){
  const ranked=[...candidates].sort((a,b)=>d(b,actor.p)-d(a,actor.p)||a.x-b.x||a.y-b.y);
  for(const target of ranked){
   if([...goals.values()].some(x=>d(target,x)<26))continue;
   if(!planMove(s,actor.id,target))continue;
   goals.set(actor.id,target);break;
  }
 }
 return goals;
}
function planEntry(s,actors){
 const start=actors[0].p,goals=new Map();
 const candidates=[...s.doors].filter(door=>door.kind!=='sliding'&&door.kind!=='shutter')
  .sort((a,b)=>d(start,{x:(a.a.x+a.b.x)/2,y:(a.a.y+a.b.y)/2})-
    d(start,{x:(b.a.x+b.b.x)/2,y:(b.a.y+b.b.y)/2})||a.id.localeCompare(b.id));
 for(const door of candidates.slice(0,12)){
  if(!planSquadEntry(s,door.id))continue;
  for(const a of actors){const node=a.plan.find(n=>n.entryDoorId===door.id);
   if(node)goals.set(a.id,node.p);}
  return goals;
 }
 return goals;
}
function trace(case_){
 const idx=case_.site==='house'?0:case_.site==='retail'?3:8;
 const scale=idx%2===0?'small':'standard',seed=case_.seed;
 const site=generateSite(seed,scale,undefined,{mission:'intel'},{archetype:case_.site});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,seed,'full-view',site.scale??'small','intel',quiet,
  {enableCivilians:false});
 try{
  const actors=team(s).slice(0,4),goals=case_.kind==='entry'?
   planEntry(s,actors):planFour(s,actors,site);
  const actor=actors.find(a=>a.id===case_.id),goal=goals.get(case_.id);
  if(!goal)throw Error('target not authored '+JSON.stringify(case_));
  toggling(s);const checkpoints=[];
  for(let tick=0;tick<2100;tick++){
   stepSession(s,1/60);
   if((tick+1)%300===0){
    checkpoints.push({seconds:r(s.seconds),p:{...actor.p},
     gap:r(d(actor.p,goal)),blocked:r(actor.blockedTime),
     retry:actor.recoveryAttempts,plan:actor.plan[0]?.kind??null,
     nav:actor.nav.slice(0,2),pause:actor.motorPause,
     last:actor.lastBlocker});
   }
  }
  const world=sessionWorldGeometry(s);
  const cover=world.cover.filter(o=>
   Math.abs(o.x-actor.p.x)<o.w/2+30&&Math.abs(o.y-actor.p.y)<o.h/2+30)
   .map(o=>({id:o.id,fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h}));
  const nearest=s.doors.map(o=>({id:o.id,gap:r(pointToSegment(actor.p,doorLeafSegment(o))),open:o.open,
   fraction:r(o.openFraction??0),locked:o.locked}))
   .sort((a,b)=>a.gap-b.gap).slice(0,3);
  const teammates=actors.filter(a=>a!==actor)
   .map(a=>({id:a.id,p:a.p,fromGoal:r(d(a.p,goal)),fromActor:r(d(a.p,actor.p)),
     plan:a.plan[0]?.kind??null}));
  const firstNav=actor.nav[0]??null;
  return {...case_,goal,p:actor.p,gap:r(d(actor.p,goal)),
   checkpoints,remainingOrders:actor.plan.length,
   nav:firstNav,cover,nearest,teammates,
   geometry:{goalPassable:world.passable(goal,OPERATOR_RADIUS),
    actorPassable:world.passable(actor.p,OPERATOR_RADIUS),
    goalBodyClear:bodyClear(goal,s.doors,OPERATOR_RADIUS,world),
    actorBodyClear:bodyClear(actor.p,s.doors,OPERATOR_RADIUS,world),
    directSwept:sweptBodyClear(actor.p,goal,s.doors,OPERATOR_RADIUS,world),
    navSwept:firstNav?sweptBodyClear(actor.p,firstNav,s.doors,OPERATOR_RADIUS,world):null,
    directBlock:diagnoseMovement(actor.p,goal,s.doors,[],OPERATOR_RADIUS,world).blocker,
    worldRoute:routeWithSqueezeWorld(actor.p,goal,s.doors,world).slice(0,6)
   },cancel:s.events.filter(x=>typeof x==='string'&&x.includes('ORDER CANCELLED'))};
 }finally{activateSite(null);}
}
console.log(JSON.stringify(examples.map(trace)));
