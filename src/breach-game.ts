/**
 * Fieldwork Breach 053–062: authoritative, fixed-step tactical session.
 * Author intent is editable PlanNode[]; motor navigation is transient.
 * Legacy 052 entrypoints remain in breach-core for comparison/tests only.
 */
import {
  type Pt,type Operator,type TacticalState,type Door,type Side,
  WALLS,COVER,initialDoors,newTacticalState,route,passable,activateSite,
  segmentsCross,doorCenter,
} from './breach-core.ts';
import {
  type PlanNode,type PlanHistory,type PlanKind,type DoorMethod,
  type AimMode,type AimInstruction,
  makeHistory,copyNodes,record,undo,redo,modifyNode,lastPoint,
  length,targetAngle,angleDifference,type PieSide,
} from './breach-plan.ts';
import {validPieArc} from './breach-maneuvers.ts';
import {generateSite,type Site,seeded} from './breach-site.ts';

export type Posture='stand'|'crouch';
export type Alert='idle'|'suspicious'|'investigating'|'engaging'|'cover'|'retreat';
export type Personality='guard'|'aggressor'|'cautious';
export type TeamActor=Operator & {
  plan:PlanNode[];history:PlanHistory;nav:Pt[];activeNode:number;
  posture:Posture;alert:Alert;velocity:number;turning:number;
  aim: number;targetId:string|null;suppression:number;stamina:number;
  magazine:number;reserve:number;reload:number;hits:number;kills:number;
  stopped:boolean;haltOnContact:boolean;retreatPoint:Pt|null;
  contact:Pt|null;heard:Pt|null;
  alertUntil:number;waitRemaining:number;syncReady:string|null;
  actionTimer:number;blockedTime:number;priorP:Pt;pieIndex:number;
  /** Last executed facing command; survives across movement waypoints. */
  aimInstruction:AimInstruction|null;
  /** Simulation-timed cues, not new combat rules. */
  lastHitAt:number;lastDownAt:number;
  /** Temporary cooperative sidestep, independent of authored orders. */
  yieldTarget:Pt|null;yieldFor:string|null;yieldUntil:number;
  personality:Personality;morale:number;lastNoiseAt:number;
  flashUntil:number;
};
export type NoiseEvent={p:Pt;radius:number;time:number;kind:string};
export type ShotEvent={
  id:number;shooterId:string;targetId:string|null;
  start:Pt;end:Pt;age:number;hit:boolean;side:Side;
  healthBefore:number;healthAfter:number;down:boolean;
  surface?:'blood'|'wood'|'stone'|'metal'|'dust';
};
export type ImpactMark={id:number;p:Pt;surface:ShotEvent['surface'];age:number};
export type DroppedMagazine={id:number;p:Pt;side:Side;age:number};
export type FlashGrenade={id:number;p:Pt;from:Pt;to:Pt;age:number;fuse:number};
export type FlashBurst={id:number;p:Pt;age:number};
export type KnownContact={p:Pt;at:number;status:'seen'|'heard'};
export type MissionStage='clear'|'secure'|'extract'|'done';
export type Scenario={index:number;name:string;objective:Pt;extract:Pt};
export type Session=Omit<TacticalState,'operators'> & {
  operators:TeamActor[];variant:number;scenario:Scenario;
  mission:MissionStage;nextId:number;noise:NoiseEvent[];
  shots:ShotEvent[];nextShotId:number;known:Map<string,KnownContact>;
  seenGround:Set<string>;timesPaused:number;deaths:number;
  started:boolean;syncCode:number;report:string[];
  movementNoiseAt:number;site?:Site;dropped:DroppedMagazine[];
  grenades:FlashGrenade[];flashBursts:FlashBurst[];flashRemaining:number;
  nextEffectId:number;impactMarks:ImpactMark[];};
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
  pieIndex:0,aimInstruction:null,lastHitAt:-100,lastDownAt:-100,
  yieldTarget:null,yieldFor:null,yieldUntil:0,
  personality:'guard',morale:1,lastNoiseAt:-1,flashUntil:-1,
});
/** Omitted seed keeps 052's historic static study for regression tests.
 * The actual game passes a unique seed on each newly loaded site.
 */
export function newSession(index=0,siteSeed?:number):Session{
  const site=siteSeed===undefined?undefined:generateSite(siteSeed>>>0);
  activateSite(site??null);
  const seed=newTacticalState();
  const variant=((index%SCENARIOS.length)+SCENARIOS.length)%SCENARIOS.length;
  const sample=SCENARIOS[variant];
  const operators=seed.operators.map(withActions);
  if(site){
    // Two more independently commanded operators, not cloned simulations.
    const rook=operators.find(a=>a.id==='rook')!;
    for(const [id,name] of [['ash','ASH'],['vale','VALE']]){
      const base={...rook,id,name,p:{...rook.p},path:[],
        lastSpotted:null,shots:0,fireCd:0,health:2};
      operators.push(withActions(base));
    }
    const friendly=operators.filter(a=>a.side==='blue');
    friendly.forEach((a,i)=>{
      a.p={...site.spawn[i]};a.heading=-Math.PI/2;
      a.priorP={...a.p};
    });
    // Site danger scales gently with room count; guards never spawn outside
    // their generated rooms, and every corpse uses the actual site geometry.
    const old=operators.filter(a=>a.side==='red');
    const enemyRng=seeded(site.seed^0x8bd7812f);
    for(let i=0;i<site.enemies.length;i++){
      let a:TeamActor;
      if(i<old.length)a=old[i];
      else{
        const source=old[i%old.length];
        a=withActions({...source,id:'guard'+i,
          name:'GUARD '+(i+1),p:{...source.p},path:[],
          lastSpotted:null,shots:0,fireCd:0,health:2});
        operators.push(a);
      }
      a.p={...site.enemies[i]};a.priorP={...a.p};
      a.heading=enemyRng()*Math.PI*2;
      a.health=site.roomCount>=5?2:(enemyRng()<.55?1:2);
      a.magazine=10;a.reserve=30;
      a.personality=(['guard','aggressor','cautious'] as const)[Math.floor(enemyRng()*3)];
      a.morale=.48+enemyRng()*.52;
    }
  }else operators.filter(a=>a.side==='red').forEach((a,i)=>{
    const pos=sample.spots[i];a.p={x:pos.x,y:pos.y};a.heading=pos.h;
    a.health=2;a.magazine=10;a.reserve=30;
  });
  const state:Session={...seed,operators,doors:initialDoors(),variant,nextId:1,
    scenario:{index:variant,name:site?.name??sample.name,
      objective:clone(site?.objective??OBJECTIVE),
      extract:clone(site?.extract??EXTRACTION)},
    mission:'clear',noise:[],shots:[],nextShotId:1,known:new Map(),
    seenGround:new Set(),timesPaused:0,deaths:0,started:false,
    syncCode:0,report:[],movementNoiseAt:0,site,
    dropped:[],grenades:[],flashBursts:[],flashRemaining:2,nextEffectId:1,impactMarks:[]};
  observe(state);
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
    }else if(n.kind==='pie'&&n.arc?.length){
      points.push(...n.arc);from=n.arc[n.arc.length-1];
    }
  }
  a.path=points;
  a.activeNode=-1;a.nav=[];a.waitRemaining=0;a.actionTimer=0;
  a.syncReady=null;a.pieIndex=0;
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
export function planMove(s:Session,id:string,p:Pt,strafe=false){
  const a=party(s,id);
  if(!a)return false;
  const extra=strafe?{moveMode:'strafe' as const,
    facing:[...a.plan].reverse().find(n=>n.facing!==undefined)?.facing??a.heading}:{};
  return addNode(s,id,'move',p,extra);
}
/** A finger-drawn path is one undoable gesture, while BACK removes one node. */
export function planMoveStroke(s:Session,id:string,points:Pt[],strafe=false){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed:PlanNode[]=[];
  let from=finalPoint(a);
  const facing=[...a.plan].reverse().find(n=>n.facing!==undefined)?.facing??a.heading;
  for(const point of points.slice(0,60)){
    if(d(from,point)<20||!passable(point)||!route(from,point).length)continue;
    proposed.push({id:s.nextId+proposed.length,kind:'move',p:clone(point),
      ...(strafe?{moveMode:'strafe' as const,facing}:{})});
    from=point;
  }
  if(!proposed.length)return false;
  return edit(s,a,()=>{a.plan.push(...proposed);s.nextId+=proposed.length;});
}
export function setStrafe(s:Session,id:string,nodeId:number):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=a.plan.find(n=>n.id===nodeId);
  if(!node||node.kind!=='move')return false;
  return edit(s,a,()=>{
    if(node.moveMode==='strafe'){
      node.moveMode='advance';
    }else{
      node.moveMode='strafe';
      node.facing??=[...a.plan.slice(0,a.plan.indexOf(node))]
        .reverse().find(n=>n.facing!==undefined)?.facing??a.heading;
    }
  });
}
/** Remove exactly one final queued order (not the whole plan or its path). */
export function backOne(s:Session,id:string){
  const a=party(s,id);
  if(!a||!canEdit(s)||!a.plan.length)return false;
  const tail=a.plan.at(-1)!;
  // A shared sync must not leave the partner waiting for an absent code.
  if(tail.kind==='sync'&&tail.syncCode){
    for(const partner of team(s)){
      if(partner===a)continue;
      const index=partner.plan.findIndex(n=>
        n.kind==='sync'&&n.syncCode===tail.syncCode);
      if(index>=0)edit(s,partner,()=>{partner.plan.splice(index,1);});
    }
  }
  return edit(s,a,()=>{a.plan.pop();});
}
/** The player chooses a world-space pivot; doors are no longer special. */
export function planPieAt(s:Session,id:string,pivot:Pt,side:PieSide,degrees=54,
  afterNodeId?:number){
  const a=party(s,id);
  if(!a||!canEdit(s))return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<=0&&afterNodeId!==undefined)return false;
  const start=index===0?a.p:a.plan[index-1].p;
  const arc=validPieArc(start,pivot,side,s.doors,degrees);
  if(!arc.length)return false;
  if(afterNodeId===undefined)return addNode(s,id,'pie',arc[arc.length-1],{
    pivot:clone(pivot),pieSide:side,pieDegrees:degrees,arc:arc.map(clone)});
  const proposed=copyNodes(a.plan);
  proposed.splice(index,0,{id:s.nextId,kind:'pie',p:clone(arc.at(-1)!),
    pivot:clone(pivot),pieSide:side,pieDegrees:degrees,arc:arc.map(clone)});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
/** Retain compatibility with Build 063's doorway shortcut. */
export function planPie(s:Session,id:string,doorId:string,side:PieSide){
  const door=s.doors.find(d=>d.id===doorId);
  return !!door&&planPieAt(s,id,doorCenter(door),side);
}
/** Move a pivot or adjust the arc sweep, retaining one undoable order. */
export function editPie(s:Session,id:string,nodeId:number,
  pivot:Pt,degrees?:number,side?:PieSide){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed=copyNodes(a.plan),index=proposed.findIndex(n=>n.id===nodeId);
  if(index<0||proposed[index].kind!=='pie')return false;
  proposed[index].pivot=clone(pivot);
  if(degrees!==undefined)proposed[index].pieDegrees=clamp(degrees,8,120);
  if(side)proposed[index].pieSide=side;
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;});
}
/** Context-aware door action at a selected planned position. */
export function doorAtNode(s:Session,id:string,doorId:string,method:DoorMethod,nodeId?:number){
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s))return false;
  if(nodeId===undefined){
    if(d(finalPoint(a),doorCenter(door))>43)return planDoor(s,id,doorId,method);
    return addNode(s,id,'door',finalPoint(a),{doorId,method});
  }
  const index=a.plan.findIndex(n=>n.id===nodeId);
  if(index<0||d(a.plan[index].p,doorCenter(door))>43)return false;
  const position=clone(a.plan[index].p);
  return edit(s,a,()=>{
    a.plan.splice(index+1,0,{id:s.nextId++,kind:'door',
      p:position,doorId,method});
  });
}

/** Recalculate dependent pie arcs when an earlier waypoint changes. */
function validEditedPlan(s:Session,start:Pt,proposed:PlanNode[]){
  let from=start;
  for(const n of proposed){
    if(n.kind==='pie'){
      if(!n.pivot||!n.pieSide)return false;
      const arc=validPieArc(from,n.pivot,n.pieSide,s.doors,n.pieDegrees??54);
      if(!arc.length)return false;
      n.arc=arc;n.p=clone(arc[arc.length-1]);from=n.p;
    }else if(n.kind==='move'||n.kind==='door'){
      if(!passable(n.p)||!route(from,n.p).length)return false;
      from=n.p;
    }
  }
  return true;
}
export function movePlanNode(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!passable(p)||!canEdit(s))return false;
  const proposed=copyNodes(a.plan);
  if(!modifyNode(proposed,nodeId,{p}))return false;
  const changed=proposed.find(n=>n.id===nodeId);
  if(changed?.kind==='door'){
    const doorway=s.doors.find(door=>door.id===changed.doorId);
    if(!doorway||d(changed.p,doorCenter(doorway))>43)return false;
  }
  if(changed?.kind==='pie')return false; // Pivot and side, not arc endpoint, define a pie.
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;});
}
export function deletePlanNode(s:Session,id:string,nodeId:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const index=a.plan.findIndex(n=>n.id===nodeId);
  if(index<0)return false;
  const proposed=copyNodes(a.plan);proposed.splice(index,1);
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;});
}
export function insertPlanNode(s:Session,id:string,index:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s)||!passable(p))return false;
  const position=clamp(index,0,a.plan.length);
  const proposed=copyNodes(a.plan);
  proposed.splice(position,0,{id:s.nextId,kind:'move',p:clone(p)});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
/**
 * An aim instruction is an order, not a movement geometry.
 * Fixed holds one world heading; track continuously faces a fixed world point.
 * A selected waypoint applies its instruction on arrival, then all subsequent
 * walking inherits it until another aim instruction explicitly overrides it.
 */
export function planAim(s:Session,id:string,mode:AimMode,target:Pt,nodeId?:number,
  label:'look'|'strafe'|'pie'=mode==='track'?'pie':'look'){
  const a=party(s,id);
  if(!a||!canEdit(s)||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  const pos=node?.p??finalPoint(a);
  if(d(pos,target)<2)return false;
  const patch:Partial<PlanNode>=mode==='track'?
    {aimMode:'track',facing:undefined,aimPoint:clone(target),aimLabel:label}:
    {aimMode:mode,facing:angle(pos,target),aimPoint:undefined,aimLabel:label};
  if(node)return edit(s,a,()=>{
    node.aimMode=patch.aimMode;node.facing=patch.facing;
    node.aimPoint=patch.aimPoint;node.aimLabel=patch.aimLabel;
  });
  return addNode(s,id,'look',pos,patch);
}
export function updatePlanFacing(s:Session,id:string,nodeId:number,p:Pt){
  return planAim(s,id,'fixed',p,nodeId);
}
export function planLook(s:Session,id:string,p:Pt,nodeId?:number){
  const a=party(s,id);if(!a)return false;
  const node=nodeId!==undefined?a.plan.find(n=>n.id===nodeId):a.plan.at(-1);
  return planAim(s,id,'fixed',p,node?.id);
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
/** Plan an actual reserved stack position on the same approach side.
 * Four positions are spaced along the door frame, with a second rank.
 */
export function planStack(s:Session,id:string,doorId:string,afterNodeId?:number){
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s))return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<=0&&afterNodeId!==undefined)return false;
  const from=index===0?a.p:a.plan[index-1].p,center=doorCenter(door);
  const horizontal=Math.abs(door.a.y-door.b.y)<1;
  const approachSide=horizontal?
    Math.sign(from.y-center.y)||1:Math.sign(from.x-center.x)||1;
  const assigned=team(s).filter(b=>b!==a&&b.health>0)
    .map(b=>b.plan.find(n=>n.stackDoorId===doorId))
    .filter((n):n is PlanNode=>!!n);
  const occupied=assigned.map(n=>n.p);
  // All four slots must remain within the 43-unit door-use radius.
  // The first two take opposite sides of the frame; the next two fill in
  // behind the opening. This prevents two-person legacy stack regressions.
  const positions=[-38,38,-12,12];
  const preferred=team(s).findIndex(b=>b.id===id);
  const candidates:Pt[]=positions.map(tangent=>horizontal?
    {x:center.x+tangent,y:center.y+approachSide*19}:
    {x:center.x+approachSide*19,y:center.y+tangent});
  // Smaller entrance frames retain valid nearby choices; never pick a
  // physical stack slot too far away to use the door.
  const legal=candidates.filter(p=>
    d(p,center)<43&&passable(p)&&!!route(from,p).length&&
    occupied.every(other=>d(p,other)>23));
  legal.sort((u,v)=>{
    const rank=(p:Pt)=>{
      const i=candidates.findIndex(candidate=>d(candidate,p)<1);
      return (i-preferred+4)%4;
    };
    return rank(u)-rank(v)||d(from,u)-d(from,v);
  });
  if(!legal.length)return false;
  const point=legal[0],proposed=copyNodes(a.plan);
  proposed.splice(index,0,{id:s.nextId,kind:'move',p:clone(point),
    moveMode:'strafe',facing:angle(point,center),
    aimMode:'track',aimPoint:clone(center),aimLabel:'pie',
    stackDoorId:doorId});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}
/** One tap queues four distinct doorway positions. Existing orders are
 * retained; a failed actor allocation leaves the completed positions intact
 * so players can adjust a tight site individually.
 */
export function planStackTeam(s:Session,doorId:string){
  if(!canEdit(s))return false;
  let count=0;
  for(const a of team(s))if(a.health>0&&planStack(s,a.id,doorId))count++;
  if(count)notify(s,'STACK '+count+' / '+team(s).filter(a=>a.health>0).length);
  return count>0;
}
/** Coordinated entry: reserve distinct stack positions, synchronize at
 * a shared go-code, open the door with the lead, then feed others through
 * at staggered intervals. Tactical pathfinding remains authoritative.
 */
export function planSquadEntry(s:Session,doorId:string){
  const door=s.doors.find(d=>d.id===doorId);
  if(!door||!canEdit(s))return false;
  const alive=team(s).filter(a=>a.health>0);
  if(!alive.length)return false;
  // The user can first position a squad manually; honor existing stack
  // positions instead of duplicating them.
  for(const a of alive){
    if(!a.plan.some(n=>n.stackDoorId===doorId)&&
      !planStack(s,a.id,doorId))return false;
  }
  if(!planSync(s))return false;
  const center=doorCenter(door),horizontal=Math.abs(door.a.y-door.b.y)<1;
  const lead=alive[0],p=finalPoint(lead);
  const side=horizontal?Math.sign(p.y-center.y)||1:
    Math.sign(p.x-center.x)||1;
  if(!planDoor(s,lead.id,doorId,'open'))return false;
  for(let i=0;i<alive.length;i++){
    const a=alive[i];
    if(i>0)planWait(s,a.id,.3+i*.24);
    const inside=horizontal?{x:center.x+(i%2?9:-9),
      y:center.y-side*62}:{x:center.x-side*62,
      y:center.y+(i%2?9:-9)};
    if(passable(inside))planMove(s,a.id,inside);
  }
  notify(s,'SQUAD ENTRY READY · GO TO EXECUTE');
  return true;
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
/** Manual or automatic reload, with a physical discarded magazine. */
export function beginReload(s:Session,a:TeamActor):boolean{
  if(a.health<=0||a.reload>0||a.reserve<=0||a.magazine>=12)return false;
  s.dropped.push({id:s.nextEffectId++,p:clone(a.p),side:a.side,age:0});
  if(s.dropped.length>48)s.dropped.shift();
  a.magazine=0;a.reload=1.8;a.aim=0;
  notify(s,a.name+' RELOADING');
  return true;
}
/** Two team-wide flashbangs per mission. Throwing is an authored timed order. */
export function planFlash(s:Session,id:string,target:Pt):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s)||!passable(target))return false;
  const queued=team(s).reduce((n,x)=>n+
    x.plan.filter(node=>node.kind==='flash').length,0);
  const start=finalPoint(a);
  if(queued>=s.flashRemaining||d(start,target)>160||d(start,target)<16)return false;
  const ray={a:start,b:target};
  if(WALLS.some(w=>segmentsCross(ray,w))||
    s.doors.some(w=>!w.open&&segmentsCross(ray,w)))return false;
  return addNode(s,id,'flash',start,{aimPoint:clone(target)});
}
export function planReload(s:Session,id:string):boolean{
  const a=party(s,id);
  return !!a&&canEdit(s)&&addNode(s,id,'reload',finalPoint(a));
}
export function reloadNow(s:Session,id:string):boolean{
  const a=party(s,id);
  return !!a&&s.phase==='running'&&beginReload(s,a);
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
/** Let a temporarily idle teammate step into a safe passing pocket.
 * Keep every authored waypoint: this is transient traffic, not plan editing.
 */
function yieldPocket(blocker:TeamActor,requester:TeamActor,s:Session):Pt|null{
  const dx=blocker.p.x-requester.p.x;
  const dy=blocker.p.y-requester.p.y;
  const len=Math.hypot(dx,dy)||1;
  const side={x:-dy/len,y:dx/len};
  const backwards={x:dx/len,y:dy/len};
  const options:Pt[]=[];
  for(const offset of [18,23,28,14]){
    for(const sign of [1,-1]){
      options.push({x:blocker.p.x+side.x*offset*sign,
        y:blocker.p.y+side.y*offset*sign});
    }
  }
  // A doorway can have only one free side; retreating into a nearby
  // pocket is preferable to overlapping actors whenever space exists.
  for(const offset of [18,25]){
    options.push({x:blocker.p.x+backwards.x*offset,
      y:blocker.p.y+backwards.y*offset});
  }
  return options.filter(pos=>{
    if(!passable(pos))return false;
    if(s.operators.some(b=>b!==blocker&&b!==requester&&b.health>0&&
      d(pos,b.p)<18))return false;
    // Do not sidestep through walls, closed doors, or cover.
    for(let i=1;i<=5;i++){
      const t=i/5,step={x:blocker.p.x+(pos.x-blocker.p.x)*t,
        y:blocker.p.y+(pos.y-blocker.p.y)*t};
      if(!passable(step)||s.doors.some(door=>!door.open&&
        segmentsCross({a:blocker.p,b:step},door)))return false;
    }
    return true;
  }).sort((u,v)=>
    d(v,requester.p)-d(u,requester.p)||
    d(u,blocker.p)-d(v,blocker.p))[0]??null;
}
function deferToTeammate(s:Session,blocker:TeamActor,requester:TeamActor){
  if(blocker.yieldTarget||blocker.health<=0)return false;
  const requesterRank=s.operators.indexOf(requester);
  const blockerRank=s.operators.indexOf(blocker);
  const blockerActive=blocker.plan.some(n=>n.kind==='move'||n.kind==='door');
  // A teammate actually making progress owns the lane. If both are stuck,
  // a stable actor order breaks ties rather than yielding to each other.
  if(blockerActive&&blocker.blockedTime<.24&&blocker.velocity>12)
    return false;
  if(blockerActive&&blocker.blockedTime>.24&&requesterRank>blockerRank)
    return false;
  const target=yieldPocket(blocker,requester,s);
  if(!target)return false;
  blocker.yieldTarget=target;blocker.yieldFor=requester.id;
  blocker.yieldUntil=s.seconds+2.1;blocker.nav=[];
  notify(s,blocker.name+' YIELDING TO '+requester.name);
  return true;
}
function stepYield(s:Session,a:TeamActor,dt:number):boolean{
  if(!a.yieldTarget)return false;
  const requester=s.operators.find(other=>other.id===a.yieldFor);
  const clear= !requester||requester.health<=0||
    d(a.p,requester.p)>31;
  const arrived=d(a.p,a.yieldTarget)<2;
  if(s.seconds>a.yieldUntil||(clear&&arrived)){
    a.yieldTarget=null;a.yieldFor=null;a.yieldUntil=0;
    a.nav=[];a.velocity=0;
    return false;
  }
  if(!arrived){
    const distance=d(a.p,a.yieldTarget);
    const advance=Math.min(distance,50*dt);
    const candidate={x:a.p.x+
      (a.yieldTarget.x-a.p.x)/distance*advance,
      y:a.p.y+(a.yieldTarget.y-a.p.y)/distance*advance};
    if(passable(candidate)&&!s.doors.some(door=>!door.open&&
      segmentsCross({a:a.p,b:candidate},door))){
      a.priorP=clone(a.p);a.p=candidate;a.velocity=50;
    }else{
      a.yieldTarget=null;a.yieldFor=null;a.yieldUntil=0;a.nav=[];
      return false;
    }
  }else a.velocity=0;
  return true;
}
function approach(a:TeamActor,p:Pt,dt:number,s:Session,speedScale=1){
  if(!a.nav.length){
    a.nav=route(a.p,p);
    if(!a.nav.length){notify(s,a.name+' CANNOT REACH');return false;}
  }
  const next=a.nav[0],gap=d(a.p,next);
  if(gap<3){a.nav.shift();return false;}
  const direction=angle(a.p,next);
  const movingSpeed=a.side==='blue'?75:62;
  const suppression=clamp(1-a.suppression*.4,.45,1);
  const desired=movingSpeed*(a.posture==='crouch'?.58:1)*suppression*speedScale;
  a.velocity+=(desired-a.velocity)*Math.min(1,dt*6);
  const advance=Math.min(gap,a.velocity*dt);
  const move={x:a.p.x+Math.cos(direction)*advance,
    y:a.p.y+Math.sin(direction)*advance};
  const closedDoor=s.doors.find(door=>!door.open&&
    segmentsCross({a:a.p,b:move},door));
  const closed=!!closedDoor;
  if(closedDoor&&a.side==='red'&&d(a.p,doorCenter(closedDoor))<49){
    a.actionTimer+=dt;
    if(a.actionTimer>=.55){
      closedDoor.open=true;closedDoor.openedAt=s.seconds;
      hear(s,doorCenter(closedDoor),125,'door');
      notify(s,a.name+' OPENED '+closedDoor.id);
      a.actionTimer=0;
    }
  }else if(a.side==='red')a.actionTimer=0;
  const blocking=s.operators.find(b=>b!==a&&b.health>0&&
    d(b.p,move)<(b.side===a.side?15:11));
  const teammate=blocking?.side===a.side?blocking:null;
  // A reciprocal jam needs a deterministic resolution. Prefer yielding
  // in nearby free space; after prolonged blockage, permit a brief
  // same-team shoulder pass rather than deadlocking a door indefinitely.
  if(teammate&&a.blockedTime>.32)
    deferToTeammate(s,teammate,a);
  const shoulderPass=!!teammate&&a.blockedTime>1.65;
  if(!closed&&(!blocking||shoulderPass)&&passable(move)){
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
/** Aim targets are recomputed after EVERY movement tick, not on waypoint entry. */
function aimHeading(a:TeamActor):number|null{
  const instruction=a.aimInstruction;
  if(!instruction)return null;
  if(instruction.mode==='free')return null;
  if(instruction.mode==='fixed')return instruction.angle??a.heading;
  if(!instruction.point||d(a.p,instruction.point)<2)return a.heading;
  return angle(a.p,instruction.point);
}
function applyAimNode(a:TeamActor,n:PlanNode){
  if(n.aimMode==='free')a.aimInstruction=null;
  else if(n.aimMode==='track'&&n.aimPoint)
    a.aimInstruction={mode:'track',point:clone(n.aimPoint)};
  else if(n.aimMode==='fixed'&&n.facing!==undefined)
    a.aimInstruction={mode:'fixed',angle:n.facing};
  else if(n.facing!==undefined)
    a.aimInstruction={mode:'fixed',angle:n.facing};
}
function pop(a:TeamActor){
  a.plan.shift();a.activeNode=-1;a.nav=[];a.waitRemaining=0;
  a.actionTimer=0;a.syncReady=null;a.pieIndex=0;pathFor(a);
}
function runOrders(s:Session,a:TeamActor,dt:number){
  // A stationary or opposing teammate may briefly step aside, then resume
  // its original queue. This overrides motor movement, not tactical aiming.
  if(stepYield(s,a,dt)){
    const held=aimHeading(a);
    if(held!==null)rotate(a,held,dt);
    return;
  }
  const n=a.plan[0];
  if(a.haltOnContact){
    const threat=enemies(s).find(e=>inSight(a,e,s));
    if(threat){
      a.velocity=0;rotate(a,angle(a.p,threat.p),dt);return;
    }
  }
  if(!n||a.health<=0){
    a.velocity=Math.max(0,a.velocity-dt*160);
    const held=aimHeading(a);
    if(a.health>0&&held!==null)rotate(a,held,dt);
    return;
  }
  if(a.activeNode!==n.id){
    a.activeNode=n.id;a.nav=[];a.waitRemaining=0;a.actionTimer=0;
    a.pieIndex=0;
  }
  if(n.kind==='pie'){
    const arc=n.arc??[];
    const point=arc[a.pieIndex];
    if(!point){pop(a);return;}
    if(near(a.p,point,3.7)){
      a.pieIndex++;a.nav=[];a.velocity=Math.min(a.velocity,32);
      if(a.pieIndex>=arc.length){pop(a);return;}
    }else{
      // Pieing advances along the physical arc, gun always oriented
      // toward the doorway pivot rather than tangential travel.
      approach(a,point,dt,s,.44);
    }
    if(n.pivot)rotate(a,angle(a.p,n.pivot),dt);
    return;
  }
  const at=near(a.p,n.p,5);
  if(!at&&(n.kind==='move'||n.kind==='door'||n.kind==='sync')){
    approach(a,n.p,dt,s,n.moveMode==='strafe'?.68:1);
    // Unmodified movement follows its route, while an explicit fixed STRAFE
    // or PIE/TRACK instruction persists until LOOK releases it.
    const held=aimHeading(a);
    if(held!==null)rotate(a,held,dt);
    else if(n.kind==='move'&&n.moveMode==='strafe')
      rotate(a,n.facing??a.heading,dt);
    else if(a.nav.length)
      rotate(a,angle(a.p,a.nav[0]),dt);
    return;
  }
  a.velocity=Math.max(0,a.velocity-dt*180);
  // Apply an authored look/pie/strafe instruction once we actually arrive
  // at its waypoint, then keep it active through every later movement.
  if(n.kind==='move'||n.kind==='look'){
    applyAimNode(a,n);
    if(n.aimMode==='free'&&n.facing!==undefined){
      // LOOK deliberately orients at this node, then releases any tracking
      // or fixed strafe constraint. The next move faces the travel direction.
      if(!rotate(a,n.facing,dt))return;
    }else{
      const held=aimHeading(a);
      if(held!==null)rotate(a,held,dt);
    }
    pop(a);return;
  }
  if(n.facing!==undefined&&!rotate(a,n.facing,dt))return;
  // Door/wait/sync orders should not cancel a persistent look/track intent.
  const held=aimHeading(a);
  if(held!==null)rotate(a,held,dt);
  if(n.kind==='wait'){
    a.waitRemaining+=dt;
    if(a.waitRemaining>=(n.duration??1))pop(a);
    return;
  }
  if(n.kind==='sync'){
    a.syncReady=n.syncCode??'A';
    // Only actors still carrying this code participate. An undone
    // companion order must not create a permanent one-sided deadlock.
    const code=a.syncReady;
    const peers=team(s).filter(x=>x.health>0&&
      (x.syncReady===code||x.plan.some(order=>
        order.kind==='sync'&&order.syncCode===code)));
    if(peers.every(x=>x.syncReady===code)){
      // Clear all participants in the same fixed simulation tick.
      for(const teammate of peers)pop(teammate);
      notify(s,'GO CODE '+(n.syncCode??'A'));
    }
    return;
  }
  if(n.kind==='reload'){
    if(a.magazine>=12||a.reserve<=0){pop(a);return;}
    if(a.reload===0)beginReload(s,a);
    return;
  }
  if(n.kind==='flash'){
    if(!n.aimPoint||s.flashRemaining<=0){pop(a);return;}
    a.velocity=0;rotate(a,angle(a.p,n.aimPoint),dt);
    a.actionTimer+=dt;
    if(a.actionTimer>=.3){
      s.flashRemaining--;
      s.grenades.push({id:s.nextEffectId++,p:clone(a.p),
        from:clone(a.p),to:clone(n.aimPoint),age:0,fuse:1.15});
      notify(s,a.name+' FLASH OUT');
      pop(a);
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
    n.time>a.lastNoiseAt&&s.seconds-n.time<1&&d(a.p,n.p)<n.radius);
  if(newest&&!visible.length&&a.alert!=='retreat'){
    a.lastNoiseAt=newest.time;
    const spread=newest.kind==='gunshot'?39:18;
    const heard={x:newest.p.x+(random(s)-.5)*spread,
      y:newest.p.y+(random(s)-.5)*spread};
    a.heard=heard;a.contact=heard;
    a.alertUntil=s.seconds+(a.personality==='aggressor'?.5:1.4);
    a.contacted=true;
    const needsCover=a.personality==='cautious'||
      (a.personality==='guard'&&a.morale<.65);
    if(needsCover){
      a.retreatPoint=defensivePosition(a,heard,s);
      a.alert=a.retreatPoint?'retreat':'cover';a.nav=[];
    }else a.alert='investigating';
    rotate(a,angle(a.p,heard),dt);
  }
  if(a.flashUntil>s.seconds){
    a.velocity=0;a.aim=0;a.alert='cover';return;
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
    if(a.alert==='investigating'&&d(a.p,a.contact)>40){
      // Noise gives a region to investigate, never a magic target.
      if(!a.nav.length)a.nav=route(a.p,a.contact);
      if(a.nav.length)approach(a,a.contact,dt,s,
        a.personality==='aggressor'?1.1:.82);
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
function segmentImpact(from:Pt,to:Pt,segment:{a:Pt;b:Pt}):number|null{
  const dx=to.x-from.x,dy=to.y-from.y;
  const ex=segment.b.x-segment.a.x,ey=segment.b.y-segment.a.y;
  const determinant=dx*ey-dy*ex;
  if(Math.abs(determinant)<1e-7)return null;
  const fx=segment.a.x-from.x,fy=segment.a.y-from.y;
  const t=(fx*ey-fy*ex)/determinant;
  const u=(fx*dy-fy*dx)/determinant;
  return t>=0&&t<=1&&u>=0&&u<=1?t:null;
}
function strikeSurface(from:Pt,aimed:Pt,s:Session):{
  end:Pt;surface:ShotEvent['surface']}{
  let best=1,material:ShotEvent['surface']='dust';
  for(const wall of WALLS){
    const t=segmentImpact(from,aimed,wall);
    if(t!==null&&t<best){best=t;material='stone';}
  }
  for(const door of s.doors)if(!door.open){
    const t=segmentImpact(from,aimed,door);
    if(t!==null&&t<best){best=t;material='wood';}
  }
  for(const box of COVER){
    const l=box.x-box.w/2,r=box.x+box.w/2;
    const t=box.y-box.h/2,b=box.y+box.h/2;
    const edges=[
      {a:{x:l,y:t},b:{x:r,y:t}},
      {a:{x:r,y:t},b:{x:r,y:b}},
      {a:{x:r,y:b},b:{x:l,y:b}},
      {a:{x:l,y:b},b:{x:l,y:t}},
    ];
    for(const side of edges){
      const u=segmentImpact(from,aimed,side);
      if(u!==null&&u<best){best=u;material=box.low?'wood':'metal';}
    }
  }
  return {end:{x:from.x+(aimed.x-from.x)*best,
    y:from.y+(aimed.y-from.y)*best},surface:material};
}
function fire(s:Session,a:TeamActor,dt:number){
  if(a.health<=0)return;
  if(a.reload>0){
    a.reload=Math.max(0,a.reload-dt);
    if(a.reload===0){
      const rounds=Math.min(a.side==='red'?10:12,a.reserve);
      a.magazine=rounds;a.reserve-=rounds;notify(s,a.name+' RELOADED');
    }
    return;
  }
  if(!a.magazine){beginReload(s,a);return;}
  if(a.flashUntil>s.seconds){a.aim=0;return;}
  const enemiesOf=a.side==='blue'?enemies(s):team(s);
  const target=enemiesOf.filter(e=>inSight(a,e,s))
    .sort((x,y)=>d(a.p,x.p)-d(a.p,y.p))[0];
  if(!target){
    a.targetId=null;a.aim=Math.max(0,a.aim-dt*.6);return;
  }
  if(a.targetId!==target.id){a.targetId=target.id;a.aim=0;}
  const moving=a.velocity>10;
  const acquisition=a.side==='blue'?(moving?.57:.30):.58+
    (a.personality==='cautious'?.12:0);
  a.aim=Math.min(1,a.aim+dt/acquisition);
  if(a.aim<1||a.fireCd>0)return;
  a.fireCd=a.side==='blue'?.33:.51;
  a.magazine--;a.shots++;
  const dist=d(a.p,target.p);
  const chance=clamp((a.side==='blue'?.78:.56)-dist*.0015-
    (moving?.22:0)-a.suppression*.28-
    softCoverPenalty(a,target)+(a.posture==='crouch'?.09:0)-
    (a.flashUntil>s.seconds?.38:0),.08,.92);
  const hit=random(s)<chance;
  const scatter=hit?clone(target.p):{
    x:target.p.x+(random(s)-.5)*64,
    y:target.p.y+(random(s)-.5)*64,
  };
  const impact=hit?{end:scatter,surface:'blood' as const}:
    strikeSurface(a.p,scatter,s);
  const end=impact.end;
  const healthBefore=target.health;
  const healthAfter=hit?Math.max(0,healthBefore-1):healthBefore;
  s.sparks.push({p:clone(a.p),side:a.side,age:0});
  // Immutable shot identity lets 2D/3D attach recoil and damage effects to
  // the correct actors without guessing from proximity or team color.
  s.impactMarks.push({id:s.nextEffectId++,p:clone(end),
    surface:impact.surface,age:0});
  if(s.impactMarks.length>92)s.impactMarks.shift();
  s.shots.push({
    id:s.nextShotId++,shooterId:a.id,targetId:target.id,
    start:clone(a.p),end,age:0,hit,side:a.side,
    healthBefore,healthAfter,down:hit&&healthAfter<=0,
    surface:impact.surface,
  });
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
    target.health=healthAfter;
    target.lastHitAt=s.seconds;
    a.hits++;
    if(target.health<=0){
      a.kills++;s.deaths++;target.lastDownAt=s.seconds;
      target.plan=[];target.path=[];
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
function stepFlashbangs(s:Session,h:number){
  const active:FlashGrenade[]=[];
  for(const g of s.grenades){
    g.age+=h;
    const t=Math.min(1,g.age/.55);
    const arc=4*t*(1-t);
    g.p={x:g.from.x+(g.to.x-g.from.x)*t,
      y:g.from.y+(g.to.y-g.from.y)*t};
    void arc; // The renderer supplies the vertical ballistic arc.
    if(g.age<g.fuse){active.push(g);continue;}
    s.flashBursts.push({id:g.id,p:clone(g.to),age:0});
    hear(s,g.to,420,'flashbang');
    for(const a of s.operators){
      if(a.health<=0)continue;
      const dist=d(a.p,g.to);
      if(dist>105)continue;
      const ray={a:g.to,b:a.p};
      const blocked=WALLS.some(w=>segmentsCross(ray,w))||
        s.doors.some(door=>!door.open&&segmentsCross(ray,door));
      if(blocked)continue;
      const duration=2.8*(1-dist/140);
      a.flashUntil=Math.max(a.flashUntil,s.seconds+duration);
      a.aim=0;a.suppression=Math.max(a.suppression,.68);
      if(a.side==='red'){a.alert='cover';a.nav=[];}
    }
    notify(s,'FLASH DETONATED');
  }
  s.grenades=active;
}
export function stepSession(s:Session,dt:number){
  if(s.phase!=='running')return;
  const h=clamp(dt,0,1/30);
  s.seconds+=h;
  s.sparks=s.sparks.filter(a=>(a.age+=h)<.20);
  s.shots=s.shots.filter(a=>(a.age+=h)<.40);
  s.noise=s.noise.filter(n=>s.seconds-n.time<4);
  for(const magazine of s.dropped)magazine.age+=h;
  s.impactMarks=s.impactMarks.filter(mark=>(mark.age+=h)<24);
  s.flashBursts=s.flashBursts.filter(b=>(b.age+=h)<.70);
  stepFlashbangs(s,h);
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
  if(s.mission==='secure')return 'MOVE TO RECORDS IN TARGET ROOM';
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
