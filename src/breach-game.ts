/**
 * Fieldwork Breach 053–062: authoritative, fixed-step tactical session.
 * Author intent is editable PlanNode[]; motor navigation is transient.
 * Legacy 052 entrypoints remain in breach-core for comparison/tests only.
 */
import {
  type Pt,type Operator,type TacticalState,type Door,type Side,
  WALLS,COVER,initialDoors,newTacticalState,route,passable,
  segmentsCross,doorCenter,
} from './breach-core.ts';
import {
  type PlanNode,type PlanHistory,type PlanKind,type DoorMethod,
  makeHistory,copyNodes,record,undo,redo,modifyNode,lastPoint,
  length,targetAngle,angleDifference,
} from './breach-plan.ts';

export type Posture='stand'|'crouch';
export type Alert='idle'|'suspicious'|'investigating'|'engaging'|'cover'|'retreat';
export type TeamActor=Operator & {
  plan:PlanNode[];history:PlanHistory;nav:Pt[];activeNode:number;
  posture:Posture;alert:Alert;velocity:number;turning:number;
  aim: number;targetId:string|null;suppression:number;stamina:number;
  magazine:number;reserve:number;reload:number;hits:number;kills:number;
  stopped:boolean;haltOnContact:boolean;retreatPoint:Pt|null;
  contact:Pt|null;heard:Pt|null;
  alertUntil:number;waitRemaining:number;syncReady:string|null;
  actionTimer:number;blockedTime:number;priorP:Pt;
};
export type NoiseEvent={p:Pt;radius:number;time:number;kind:string};
export type ShotEvent={start:Pt;end:Pt;age:number;hit:boolean;side:Side};
export type KnownContact={p:Pt;at:number;status:'seen'|'heard'};
export type MissionStage='clear'|'secure'|'extract'|'done';
export type Scenario={index:number;name:string;objective:Pt;extract:Pt};
export type Session=Omit<TacticalState,'operators'> & {
  operators:TeamActor[];variant:number;scenario:Scenario;
  mission:MissionStage;nextId:number;noise:NoiseEvent[];
  shots:ShotEvent[];known:Map<string,KnownContact>;
  seenGround:Set<string>;timesPaused:number;deaths:number;
  started:boolean;syncCode:number;report:string[];
  movementNoiseAt:number;};
const d=(a:Pt,b:Pt)=>length(a,b);
const clone=(p:Pt):Pt=>({...p});
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
export const OBJECTIVE:Pt={x:453,y:319};
export const EXTRACTION:Pt={x:307,y:669};
export const SCENARIOS=[
  {index:0,name:'SENTRY',spots:[{x:242,y:301,h:1.58},{x:523,y:254,h:2.48}]},
  {index:1,name:'CROSSWATCH',spots:[{x:228,y:442,h:0.6},{x:518,y:258,h:2.3}]},
  {index:2,name:'REAR GUARD',spots:[{x:262,y:213,h:1.1},{x:476,y:444,h:2.8}]},
] as const;
const withActions=(a:Operator):TeamActor=>({
  ...a,plan:[],history:makeHistory(),nav:[],activeNode:-1,
  posture:'stand',alert:'idle',velocity:0,turning:0,aim:0,
  targetId:null,suppression:0,stamina:1,magazine:12,reserve:36,
  reload:0,hits:0,kills:0,stopped:false,contact:null,heard:null,
  alertUntil:0,waitRemaining:0,syncReady:null,actionTimer:0,
  blockedTime:0,priorP:clone(a.p),haltOnContact:false,retreatPoint:null,
});
export function newSession(index=0):Session{
  const seed=newTacticalState();
  const variant=((index%SCENARIOS.length)+SCENARIOS.length)%SCENARIOS.length;
  const sample=SCENARIOS[variant];
  const operators=seed.operators.map(withActions);
  operators.filter(a=>a.side==='red').forEach((a,i)=>{
    const pos=sample.spots[i];a.p={x:pos.x,y:pos.y};a.heading=pos.h;
    a.health=2; // A single unaware guard can survive one glancing impact.
    a.magazine=10;a.reserve=30;
  });
  const state:Session={...seed,operators,doors:initialDoors(),variant,nextId:1,
    scenario:{index:variant,name:sample.name,objective:clone(OBJECTIVE),
      extract:clone(EXTRACTION)},
    mission:'clear',noise:[],shots:[],known:new Map(),
    seenGround:new Set(),timesPaused:0,deaths:0,started:false,
    syncCode:0,report:[],movementNoiseAt:0};
  observe(state); // Know the space around soldiers even before pressing GO.
  return state;
}
export const team=(s:Session)=>s.operators.filter(a=>a.side==='blue');
export const enemies=(s:Session)=>s.operators.filter(a=>a.side==='red');
export const actor=(s:Session,id:string)=>s.operators.find(a=>a.id===id);
const party=(s:Session,id:string)=>team(s).find(a=>a.id===id&&a.health>0);
export const canEdit=(s:Session)=>s.phase==='planning';
export const finalPoint=(a:TeamActor)=>lastPoint(a.p,a.plan);
function pathFor(a:TeamActor){
  const points:Pt[]=[];let from=a.p;
  for(const n of a.plan){
    if(n.kind==='move'||n.kind==='door'){
      const segment=route(from,n.p);
      if(!segment.length)continue;
      points.push(...segment);from=n.p;
    }
  }
  a.path=points;
  a.activeNode=-1;a.nav=[];a.waitRemaining=0;a.actionTimer=0;
  a.syncReady=null;
}
function edit(s:Session,a:TeamActor,fn:()=>void){
  if(!canEdit(s))return false;
  const before=copyNodes(a.plan);
  fn();
  record(a.history,before);pathFor(a);
  return true;
}
export function addNode(s:Session,id:string,kind:PlanKind,p:Pt,
  extra:Partial<PlanNode>={}):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  if((kind==='move'||kind==='door')&&!passable(p))return false;
  if((kind==='move'||kind==='door')&&
     !route(finalPoint(a),p).length)return false;
  return edit(s,a,()=>{
    a.plan.push({id:s.nextId++,kind,p:clone(p),...extra});
  });
}
export const planMove=(s:Session,id:string,p:Pt)=>addNode(s,id,'move',p);
export function movePlanNode(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!passable(p)||!canEdit(s))return false;
  const proposed=copyNodes(a.plan);
  if(!modifyNode(proposed,nodeId,{p}))return false;
  const changed=proposed.find(n=>n.id===nodeId);
  if(changed?.kind==='door'){
    const doorway=s.doors.find(door=>door.id===changed.doorId);
    if(!doorway||d(changed.p,doorCenter(doorway))>43)return false;
  }
  let from=a.p;
  for(const n of proposed){
    if(n.kind==='move'||n.kind==='door'){
      if(!route(from,n.p).length)return false;
      from=n.p;
    }
  }
  return edit(s,a,()=>{a.plan=proposed;});
}
export function deletePlanNode(s:Session,id:string,nodeId:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const index=a.plan.findIndex(n=>n.id===nodeId);
  if(index<0)return false;
  return edit(s,a,()=>a.plan.splice(index,1));
}
export function insertPlanNode(s:Session,id:string,index:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s)||!passable(p))return false;
  const position=clamp(index,0,a.plan.length);
  const proposed=copyNodes(a.plan);
  proposed.splice(position,0,{id:s.nextId,kind:'move',p:clone(p)});
  let from=a.p;
  for(const node of proposed){
    if(node.kind==='move'||node.kind==='door'){
      if(!route(from,node.p).length)return false;
      from=node.p;
    }
  }
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
export function updatePlanFacing(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const n=a.plan.find(n=>n.id===nodeId);if(!n)return false;
  return edit(s,a,()=>{
    n.facing=angle(n.p,p);
  });
}
export function planLook(s:Session,id:string,p:Pt,nodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=nodeId!==undefined?a.plan.find(n=>n.id===nodeId):a.plan.at(-1);
  if(node)return updatePlanFacing(s,id,node.id,p);
  return addNode(s,id,'look',a.p,{facing:angle(a.p,p)});
}
export function planDoor(s:Session,id:string,doorId:string,method:DoorMethod){
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s))return false;
  const c=doorCenter(door),origin=finalPoint(a);
  const vertical=Math.abs(door.a.x-door.b.x)<1;
  const candidates=vertical?
    [{x:c.x-27,y:c.y},{x:c.x+27,y:c.y}]:
    [{x:c.x,y:c.y-27},{x:c.x,y:c.y+27}];
  const reachable=candidates.filter(p=>passable(p)&&route(origin,p).length);
  reachable.sort((x,y)=>d(origin,x)-d(origin,y));
  if(!reachable[0])return false;
  return addNode(s,id,'door',reachable[0],{doorId,method});
}
export function planWait(s:Session,id:string,seconds=1.2){
  const a=party(s,id);return a?addNode(s,id,'wait',finalPoint(a),
    {duration:clamp(seconds,.3,6)}):false;
}
export function planSync(s:Session){
  if(!canEdit(s)||team(s).some(a=>a.health<=0))return false;
  const code='B'+(++s.syncCode);
  return team(s).every(a=>addNode(s,a.id,'sync',finalPoint(a),
    {syncCode:code}));
}
export function clearPlan(s:Session,id:string){
  const a=party(s,id);return a?edit(s,a,()=>{a.plan=[];}):false;
}
export function undoPlan(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const previous=undo(a.history,a.plan);if(!previous)return false;
  a.plan=previous;pathFor(a);return true;
}
export function redoPlan(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const next=redo(a.history,a.plan);if(!next)return false;
  a.plan=next;pathFor(a);return true;
}
export function toggleContactRule(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  a.haltOnContact=!a.haltOnContact;return true;
}
export function posture(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  a.posture=a.posture==='stand'?'crouch':'stand';return true;
}
export function toggling(s:Session){
  if(s.phase==='planning'){s.phase='running';s.started=true;}
  else if(s.phase==='running'){s.phase='planning';s.timesPaused++;}
}
export function notify(s:Session,event:string){
  if(s.events.at(-1)===event)return;
  s.events.push(event);if(s.events.length>12)s.events.shift();
}
function hear(s:Session,p:Pt,radius:number,kind:string){
  s.noise.push({p:clone(p),radius,time:s.seconds,kind});
  if(s.noise.length>22)s.noise.shift();
}
function unobstructed(a:Pt,b:Pt,s:Session,lowBlocks:boolean){
  const ray={a,b};
  if(WALLS.some(w=>segmentsCross(ray,w)))return false;
  if(s.doors.some(w=>!w.open&&segmentsCross(ray,w)))return false;
  const n=Math.ceil(d(a,b)/6);
  for(let i=1;i<n;i++){
    const t=i/n,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(COVER.some(o=>(!o.low||lowBlocks)&&
      Math.abs(x-o.x)<o.w/2&&Math.abs(y-o.y)<o.h/2))
      return false;
  }
  return true;
}
export function inSight(a:TeamActor,b:TeamActor,s:Session){
  if(a.health<=0||b.health<=0||d(a.p,b.p)>240)return false;
  const delta=angleDifference(a.heading,angle(a.p,b.p));
  if(Math.abs(delta)>.94)return false;
  return unobstructed(a.p,b.p,s,
    a.posture==='crouch'||b.posture==='crouch');
}
export const isSeen=(s:Session,target:TeamActor)=>
  team(s).some(a=>inSight(a,target,s));
export function lastKnown(s:Session,id:string){
  return s.known.get(id)??null;
}
function observe(s:Session){
  // Site knowledge persists, current knowledge does not. Sight has geometry,
  // distance and facing: invisible opponents never leak through the UI.
  for(const blue of team(s)){
    if(blue.health<=0)continue;
    for(let y=16;y<740;y+=40)for(let x=16;x<640;x+=40){
      const p={x,y},theta=angle(blue.p,p);
      if(d(blue.p,p)<245&&
         Math.abs(angleDifference(blue.heading,theta))<1.15&&
         unobstructed(blue.p,p,s,blue.posture==='crouch'))
        s.seenGround.add(Math.floor(x/40)+','+Math.floor(y/40));
    }
    for(const e of enemies(s)){
      if(inSight(blue,e,s)){
        const old=s.known.get(e.id);
        if(!old||s.seconds-old.at>.20)notify(s,'CONTACT '+e.name);
        s.known.set(e.id,{p:clone(e.p),at:s.seconds,status:'seen'});
        s.spotted.add(e.id);e.lastSpotted=clone(e.p);
      }
    }
  }
}
function approach(a:TeamActor,p:Pt,dt:number,s:Session){
  if(!a.nav.length){
    a.nav=route(a.p,p);
    if(!a.nav.length){notify(s,a.name+' CANNOT REACH');return false;}
  }
  const next=a.nav[0],gap=d(a.p,next);
  if(gap<3){a.nav.shift();return false;}
  const direction=angle(a.p,next);
  const movingSpeed=a.side==='blue'?75:62;
  const suppression=clamp(1-a.suppression*.4,.45,1);
  const desired=movingSpeed*(a.posture==='crouch'?.58:1)*suppression;
  a.velocity+=(desired-a.velocity)*Math.min(1,dt*6);
  const advance=Math.min(gap,a.velocity*dt);
  const move={x:a.p.x+Math.cos(direction)*advance,
    y:a.p.y+Math.sin(direction)*advance};
  const closed=s.doors.some(door=>!door.open&&
    segmentsCross({a:a.p,b:move},door));
  const occupied=s.operators.some(b=>b!==a&&b.health>0&&
    d(b.p,move)<15&&
    (b.side==='blue'||d(b.p,move)<11));
  if(!closed&&!occupied&&passable(move)){
    a.priorP=clone(a.p);a.p=move;a.blockedTime=0;
    if(a.side==='blue'&&s.seconds-s.movementNoiseAt>.54){
      hear(s,a.p,a.posture==='crouch'?30:68,'footstep');
      s.movementNoiseAt=s.seconds;
    }
  }else{
    a.velocity=Math.max(0,a.velocity-dt*130);
    a.blockedTime+=dt;
    if(a.blockedTime>1&&a.blockedTime<1.1)
      notify(s,a.name+(closed?' WAITING AT DOOR':' PATH BLOCKED'));
    // Do not discard an authored plan just because someone is in the way.
  }
  return true;
}
function rotate(a:TeamActor,goal:number,dt:number){
  const delta=angleDifference(a.heading,goal);
  const turn=clamp(delta,-dt*6,dt*6);
  a.heading+=turn;a.turning=Math.abs(delta);
  return Math.abs(delta)<.075;
}
function pop(a:TeamActor){
  a.plan.shift();a.activeNode=-1;a.nav=[];a.waitRemaining=0;
  a.actionTimer=0;a.syncReady=null;pathFor(a);
}
function runOrders(s:Session,a:TeamActor,dt:number){
  const n=a.plan[0];
  if(a.haltOnContact){
    const threat=enemies(s).find(e=>inSight(a,e,s));
    if(threat){
      a.velocity=0;rotate(a,angle(a.p,threat.p),dt);return;
    }
  }
  if(!n||a.health<=0){a.velocity=Math.max(0,a.velocity-dt*160);return;}
  if(a.activeNode!==n.id){
    a.activeNode=n.id;a.nav=[];a.waitRemaining=0;a.actionTimer=0;
  }
  const at=near(a.p,n.p,5);
  if(!at&&(n.kind==='move'||n.kind==='door'||n.kind==='sync')){
    approach(a,n.p,dt,s);
    if(n.facing!==undefined)rotate(a,n.facing,dt);
    else if(a.nav.length)rotate(a,angle(a.p,a.nav[0]),dt);
    return;
  }
  a.velocity=Math.max(0,a.velocity-dt*180);
  if(n.facing!==undefined&&!rotate(a,n.facing,dt))return;
  if(n.kind==='move'||n.kind==='look'){
    if(n.facing!==undefined&&!rotate(a,n.facing,dt))return;
    pop(a);return;
  }
  if(n.kind==='wait'){
    a.waitRemaining+=dt;
    if(a.waitRemaining>=(n.duration??1))pop(a);
    return;
  }
  if(n.kind==='sync'){
    a.syncReady=n.syncCode??'A';
    const peers=team(s).filter(x=>x.health>0);
    if(peers.every(x=>x.syncReady===a.syncReady)){
      // Clear all participants in the same fixed simulation tick.
      for(const teammate of peers)pop(teammate);
      notify(s,'GO CODE '+(n.syncCode??'A'));
    }
    return;
  }
  if(n.kind==='door'){
    const door=s.doors.find(d=>d.id===n.doorId);
    if(!door||door.open){pop(a);return;}
    if(d(a.p,doorCenter(door))>43){
      notify(s,a.name+' TOO FAR FROM DOOR');return;
    }
    const required=n.method==='kick'?.20:n.method==='hold'?1.3:.49;
    a.actionTimer+=dt;
    if(a.actionTimer>=required){
      if(n.method==='hold'){
        notify(s,door.id+' HELD CLOSED');
        pop(a);return;
      }
      door.open=true;door.openedAt=s.seconds;
      hear(s,doorCenter(door),n.method==='kick'?340:145,
        n.method==='kick'?'kick':'door');
      notify(s,door.id+' '+(n.method==='kick'?'KICKED':'OPENED'));
      pop(a);
    }
  }
}
function defensivePosition(a:TeamActor,from:Pt,s:Session):Pt|null{
  const candidates:Pt[]=[];
  for(const c of COVER){
    const signX=Math.sign(c.x-from.x)||1;
    const signY=Math.sign(c.y-from.y)||1;
    for(const p of [
      {x:c.x+signX*(c.w/2+20),y:c.y},
      {x:c.x,y:c.y+signY*(c.h/2+20)},
    ]){
      if(passable(p)&&d(p,a.p)<180&&
        !unobstructed(from,p,s,false)&&route(a.p,p).length)
        candidates.push(p);
    }
  }
  candidates.sort((x,y)=>d(x,a.p)-d(y,a.p));
  return candidates[0]??null;
}
function enemyDecisions(s:Session,a:TeamActor,dt:number){
  if(a.health<=0)return;
  const visible=team(s).filter(b=>inSight(a,b,s));
  if(visible.length){
    const b=visible.sort((x,y)=>d(x.p,a.p)-d(y.p,a.p))[0];
    a.contact=clone(b.p);a.alertUntil=s.seconds+3;a.contacted=true;
    if(a.suppression>.65&&a.alert!=='retreat'){
      a.retreatPoint=defensivePosition(a,b.p,s);
      if(a.retreatPoint){a.alert='retreat';a.nav=[];}
    }
    if(a.alert!=='retreat'){a.alert='engaging';a.nav=[];}
  }else if(s.seconds>a.alertUntil&&a.alert!=='idle'&&
    a.alert!=='retreat'&&a.alert!=='cover'){
    a.alert='investigating';a.contact=a.heard??a.contact;
  }
  const newest=[...s.noise].reverse().find(n=>
    s.seconds-n.time<1&&d(a.p,n.p)<n.radius);
  if(newest&&!visible.length&&a.alert!=='retreat'){
    a.heard=clone(newest.p);a.contact=clone(newest.p);
    a.alert='suspicious';a.alertUntil=s.seconds+1.15;
    a.contacted=true;
  }
  if(a.alert==='retreat'&&a.retreatPoint){
    if(d(a.p,a.retreatPoint)>9){
      approach(a,a.retreatPoint,dt,s);
      if(a.nav.length)rotate(a,angle(a.p,a.nav[0]),dt);
    }else{
      a.alert='cover';a.retreatPoint=null;a.nav=[];
      notify(s,a.name+' TOOK COVER');
    }
    return;
  }
  if(a.contact){
    rotate(a,angle(a.p,a.contact),dt);
    if(a.alert==='investigating'&&d(a.p,a.contact)>75){
      // Noise gives a region to investigate, never a magic target.
      if(!a.nav.length)a.nav=route(a.p,a.contact);
      if(a.nav.length)approach(a,a.contact,dt,s);
    }
    if(a.alert==='investigating'&&d(a.p,a.contact)<35){
      a.alert='cover';a.contact=null;a.nav=[];
    }
  }
}
function softCoverPenalty(_a:TeamActor,b:TeamActor){
  if(b.posture!=='crouch')return 0;
  const closeCover=COVER.some(c=>c.low&&
    Math.hypot(b.p.x-c.x,b.p.y-c.y)<Math.max(c.w,c.h)*.8);
  return closeCover?.24:0;
}
function random(s:Session){
  s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;
  return s.rng/4294967296;
}
function fire(s:Session,a:TeamActor,dt:number){
  if(a.health<=0)return;
  if(a.reload>0){
    a.reload=Math.max(0,a.reload-dt);
    if(a.reload===0){
      const rounds=Math.min(12,a.reserve);
      a.magazine=rounds;a.reserve-=rounds;notify(s,a.name+' RELOADED');
    }
    return;
  }
  if(!a.magazine){
    if(a.reserve>0){a.reload=1.8;notify(s,a.name+' RELOADING');}
    return;
  }
  const enemiesOf=a.side==='blue'?enemies(s):team(s);
  const target=enemiesOf.filter(e=>inSight(a,e,s))
    .sort((x,y)=>d(a.p,x.p)-d(a.p,y.p))[0];
  if(!target){
    a.targetId=null;a.aim=Math.max(0,a.aim-dt*.6);return;
  }
  if(a.targetId!==target.id){a.targetId=target.id;a.aim=0;}
  const moving=a.velocity>10;
  const acquisition=a.side==='blue'?(moving?.57:.30):.58;
  a.aim=Math.min(1,a.aim+dt/acquisition);
  if(a.aim<1||a.fireCd>0)return;
  a.fireCd=a.side==='blue'?.33:.51;
  a.magazine--;a.shots++;
  const dist=d(a.p,target.p);
  const chance=clamp((a.side==='blue'?.78:.56)-dist*.0015-
    (moving?.22:0)-a.suppression*.28-
    softCoverPenalty(a,target)+(a.posture==='crouch'?.09:0),.08,.92);
  const hit=random(s)<chance;
  const end=hit?clone(target.p):{
    x:target.p.x+(random(s)-.5)*31,
    y:target.p.y+(random(s)-.5)*31,
  };
  s.sparks.push({p:clone(a.p),side:a.side,age:0});
  s.shots.push({start:clone(a.p),end,age:0,hit,side:a.side});
  hear(s,a.p,400,'gunshot');
  // A shot heard behind the team suggests an imprecise location.
  // A sound NEVER exposes the exact shooter through a wall.
  if(a.side==='red'&&!isSeen(s,a)&&
     team(s).some(observer=>observer.health>0&&d(observer.p,a.p)<380)){
    s.known.set(a.id,{p:{
      x:a.p.x+(random(s)-.5)*58,y:a.p.y+(random(s)-.5)*58,
    },at:s.seconds,status:'heard'});
    notify(s,'UNSEEN GUNFIRE');
  }
  target.suppression=Math.min(1,target.suppression+.31);
  if(hit){
    target.health--;
    a.hits++;
    if(target.health<=0){
      a.kills++;s.deaths++;target.plan=[];target.path=[];
      target.nav=[];target.velocity=0;
      notify(s,target.name+' DOWN');
    }else notify(s,target.name+' HIT');
  }
}
function mission(s:Session){
  if(team(s).every(a=>a.health<=0)){
    s.phase='lost';s.report=['OPERATION FAILED','ALL OPERATORS LOST'];return;
  }
  if(s.mission==='clear'&&enemies(s).every(a=>a.health<=0)){
    s.mission='secure';notify(s,'CLEAR — SECURE THE RECORDS');
  }
  if(s.mission==='secure'&&team(s).some(a=>a.health>0&&
    near(a.p,s.scenario.objective,36))){
    s.mission='extract';notify(s,'RECORDS SECURED — EXTRACT');
  }
  if(s.mission==='extract'&&team(s).some(a=>a.health>0&&
    near(a.p,s.scenario.extract,37))){
    s.mission='done';s.phase='won';
    s.report=['STATION SECURED','RECORDS RECOVERED','EXTRACTION COMPLETE'];
    notify(s,'MISSION COMPLETE');
  }
}
export function stepSession(s:Session,dt:number){
  if(s.phase!=='running')return;
  const h=clamp(dt,0,1/30);
  s.seconds+=h;
  s.sparks=s.sparks.filter(a=>(a.age+=h)<.20);
  s.shots=s.shots.filter(a=>(a.age+=h)<.24);
  s.noise=s.noise.filter(n=>s.seconds-n.time<4);
  for(const a of s.operators){
    a.fireCd=Math.max(0,a.fireCd-h);
    a.suppression=Math.max(0,a.suppression-h*.17);
    a.priorP=clone(a.p);
    if(a.health<=0)continue;
    if(a.side==='blue')runOrders(s,a,h);
    else enemyDecisions(s,a,h);
  }
  observe(s);
  for(const a of s.operators)fire(s,a,h);
  mission(s);
}
export function missionText(s:Session){
  if(s.phase==='won')return 'COMPLETE — OPERATION SUCCESS';
  if(s.phase==='lost')return 'MISSION FAILED';
  if(s.mission==='clear')return 'CLEAR HOSTILES • SECURE THE RECORDS';
  if(s.mission==='secure')return 'MOVE TO RECORDS IN EAST ROOM';
  return 'RETURN TO EXTRACTION OUTSIDE';
}
export function debrief(s:Session){
  const own=team(s);
  return {result:s.phase,time:Math.floor(s.seconds),
    casualties:own.filter(a=>a.health<=0).length,
    shots:own.reduce((t,a)=>t+a.shots,0),
    hits:own.reduce((t,a)=>t+a.hits,0),
    kills:own.reduce((t,a)=>t+a.kills,0),
    pauses:s.timesPaused,variant:s.scenario.name,
    objective:s.mission==='done'};
}
export function knownAt(s:Session,x:number,y:number){
  return s.seenGround.has(Math.floor(x/40)+','+Math.floor(y/40));
}
export function liveVisibility(s:Session,p:Pt){
  return team(s).some(a=>a.health>0&&d(a.p,p)<240&&
    Math.abs(angleDifference(a.heading,angle(a.p,p)))<1.15&&
    unobstructed(a.p,p,s,a.posture==='crouch'));
}
export function nearestDoor(s:Session,p:Pt):Door|null{
  const items=s.doors.filter(door=>!door.open&&d(p,doorCenter(door))<35);
  items.sort((x,y)=>d(p,doorCenter(x))-d(p,doorCenter(y)));
  return items[0]??null;
}
