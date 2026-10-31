/**
 * Fieldwork Breach 053–062: authoritative, fixed-step tactical session.
 * Author intent is editable PlanNode[]; motor navigation is transient.
 * Legacy 052 entrypoints remain in breach-core for comparison/tests only.
 */
import {
  type Pt,type Operator,type TacticalState,type Door,type Side,
  WALLS,COVER,initialDoors,newTacticalState,route,passable,activateSite,
  segmentsCross,doorCenter,doorBlocksSegment,doorLeafSegment,doorBlocksRay,
  pointToSegment,
} from './breach-core.ts';
import {
  type PlanNode,type PlanHistory,type PlanKind,type DoorMethod,
  type AimMode,type AimInstruction,
  makeHistory,copyNodes,record,undo,redo,modifyNode,lastPoint,
  type FirePolicy,
  length,targetAngle,angleDifference,type PieSide,
} from './breach-plan.ts';
import {validPieArc} from './breach-maneuvers.ts';
import {entryLanes} from './breach-entry-lanes.ts';
import {generateSite,type Site,seeded} from './breach-site.ts';
import {WEAPONS,injuryOf,injurySpeed,injuryReload,
  woundSeverity,exposure,nearCover,type WeaponId,type BattleEvent}
  from './breach-combat.ts';
import {validateThrow,sampleThrow,type ThrowPath} from './breach-flash.ts';
import {segmentHitsBox} from './breach-ray.ts';
import {coverImpactFraction,aimHeight} from './breach-cover-height.ts';
import {MICRO_KEYS,MICRO_COLS} from './breach-fog-memory.ts';
import {assessFireLane,type FireBlock} from './breach-fire-safety.ts';
import {initDoor,advanceDoor,doorReachable,doorApproach,pushDoor,kickDoor} from './breach-door.ts';
import {localDetour} from './breach-cooperation.ts';
import {heardIntensity,acousticDistance} from './breach-acoustics.ts';
import {doorContactImpulse,passageWait,type PassageActor}
  from './breach-passage.ts';
import {diagnoseMovement,projectReachableGoal,type Blocker}
  from './breach-nav-diagnostics.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {DEFAULT_SKILLS,skillMultiplier,type ShootingSkills} from './breach-skills.ts';
import {BALLISTICS,approachAngle,readyMode,dispersion,shotYaw,
  rayHitsActor,muzzleEndpoint,recoverWeapon,handlingInstability,type FiringMode} from './breach-ballistics.ts';
import {chooseDefense,watchPoint,reachableInvestigation} from './breach-defense.ts';
import {operationBrief,assessOperation,
  type OperationKind} from './breach-operations.ts';
import {muzzleAtShot} from './breach-muzzle.ts';
import {initialIntel,observeIntel,discoverContactCover,routeWithIntel,intelPassable,doorKnown,
  type IntelMode,type IntelState} from './breach-intel.ts';
import {magazineKit,fullestMagazineIndex,
  reloadDuration as reloadTiming,type MagazineItem,type ReloadMode}
  from './breach-magazines.ts';
import {KICK_DURATION} from './breach-door-actions.ts';
import {CASING_LIMIT,type EjectedCasing} from './breach-effects.ts';
import {chooseFall,hitRegion,type WoundRegion,type FallPose}
  from './breach-wounds.ts';

export type Posture='stand'|'crouch';
export type Alert='idle'|'suspicious'|'investigating'|'engaging'|'cover'|'retreat';
export type Personality='guard'|'aggressor'|'cautious';
export type TeamActor=Operator & {
  plan:PlanNode[];history:PlanHistory;nav:Pt[];activeNode:number;
  posture:Posture;pace:'walk'|'run';alert:Alert;velocity:number;turning:number;
  aim: number;targetId:string|null;suppression:number;stamina:number;
  magazine:number;reserve:number;reload:number;hits:number;kills:number;
  insertedMagazineId:string;spareMagazines:MagazineItem[];
  reloadMode:ReloadMode|null;reloadStartedAt:number;
  reloadDuration:number;reloadRemoved:boolean;reloadInserted:boolean;
  reloadFromRounds:number;reloadTargetRounds:number;
  stopped:boolean;haltOnContact:boolean;retreatPoint:Pt|null;
  contact:Pt|null;heard:Pt|null;
  alertUntil:number;waitRemaining:number;syncReady:string|null;
  actionTimer:number;blockedTime:number;lastNavRepairAt:number;priorP:Pt;pieIndex:number;
  lastBlocker:Blocker;
  /** Last executed facing command; survives across movement waypoints. */
  aimInstruction:AimInstruction|null;
  /** Simulation-timed cues, not new combat rules. */
  lastHitAt:number;lastDownAt:number;
  lastHitRegion:WoundRegion;lastHitYaw:number;
  lastHitSeverity:number;downPose:FallPose;
  /** Temporary cooperative sidestep, independent of authored orders. */
  yieldTarget:Pt|null;yieldFor:string|null;yieldUntil:number;
  personality:Personality;morale:number;lastNoiseAt:number;
  lastNoiseExaminedAt:number;
  flashUntil:number;lastThrowAt:number;lastDoorAt:number;
  lastDoorId:string|null;lastDoorMethod:DoorMethod;
  stride:number;weapon:WeaponId;injuryStage:number;
  weaponYaw:number;stability:number;recoil:number;lastShotAt:number;
  lastBashAt:number;lastBashRole:'push'|'receive'|null;
  lastLaneWarnAt:number;lastFireBlock:FireBlock;
  fireMode:FiringMode;burstCount:number;skills:ShootingSkills;
  firePolicy:FirePolicy;suppressPoint:Pt|null;focusTargetId:string|null;
  defense:Pt|null;watch:Pt|null;defenseUntil:number;surrendered:boolean;
  lastFireRepositionAt:number;
};
export type NoiseEvent={p:Pt;radius:number;time:number;kind:string};
export type ShotEvent={
  id:number;shooterId:string;targetId:string|null;
  start:Pt;end:Pt;age:number;hit:boolean;side:Side;
  healthBefore:number;healthAfter:number;down:boolean;
  shotYaw?:number;mode?:FiringMode;spread?:number;
  muzzleHeight?:number;firedAt?:number;
  impactHeight?:number;
  hitRegion?:WoundRegion;downPose?:FallPose;
  surface?:'blood'|'wood'|'stone'|'metal'|'dust';
};
export type ImpactMark={id:number;p:Pt;surface:ShotEvent['surface'];age:number;
  height?:number;normal?:Pt};
export type DroppedMagazine={id:number;p:Pt;side:Side;age:number;
  weapon?:WeaponId;rounds?:number;magazineId?:string};
export type FlashGrenade={id:number;p:Pt;from:Pt;to:Pt;age:number;
  fuse:number;path?:ThrowPath};
export type FlashBurst={id:number;p:Pt;age:number};
export type KnownContact={p:Pt;at:number;status:'seen'|'heard'};
export type MissionStage='clear'|'secure'|'extract'|'done';
export type Scenario={index:number;name:string;objective:Pt;extract:Pt};
export type Session=Omit<TacticalState,'operators'> & {
  operators:TeamActor[];variant:number;scenario:Scenario;
  mission:MissionStage;nextId:number;noise:NoiseEvent[];
  shots:ShotEvent[];casings:EjectedCasing[];nextShotId:number;
  known:Map<string,KnownContact>;
  seenGround:Set<string>;intel:IntelState;intelObservedAt:number;
  timesPaused:number;deaths:number;
  started:boolean;syncCode:number;report:string[];
  movementNoiseAt:number;site?:Site;dropped:DroppedMagazine[];
  grenades:FlashGrenade[];flashBursts:FlashBurst[];flashRemaining:number;
  nextEffectId:number;impactMarks:ImpactMark[];
  battleEvents:BattleEvent[];nextBattleId:number;
  missionType:'clear'|'intel'|'rescue'|'hold'|'capture';holdTime:number;
  rescue:{p:Pt;following:string|null}|null;
  captureTarget:string|null;captureSecured:boolean;};
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
  posture:'stand',pace:'walk',alert:'idle',velocity:0,turning:0,aim:0,
  targetId:null,suppression:0,stamina:1,magazine:12,reserve:36,
  reload:0,hits:0,kills:0,stopped:false,contact:null,heard:null,
  insertedMagazineId:a.id+'/carbine/loaded',
  spareMagazines:magazineKit(a.id,'carbine',36,12),
  reloadMode:null,reloadStartedAt:-100,reloadDuration:0,
  reloadRemoved:false,reloadInserted:false,reloadFromRounds:0,
  reloadTargetRounds:0,
  alertUntil:0,waitRemaining:0,syncReady:null,actionTimer:0,
  blockedTime:0,lastNavRepairAt:-10,priorP:clone(a.p),haltOnContact:false,retreatPoint:null,
  lastBlocker:'clear',
  pieIndex:0,aimInstruction:null,lastHitAt:-100,lastDownAt:-100,
  lastHitRegion:'torso',lastHitYaw:0,lastHitSeverity:0,
  downPose:'forward',
  yieldTarget:null,yieldFor:null,yieldUntil:0,
  personality:'guard',morale:1,lastNoiseAt:-1,
  lastNoiseExaminedAt:-1,flashUntil:-1,
  lastThrowAt:-100,lastDoorAt:-100,lastDoorId:null,
  lastDoorMethod:'open',stride:0,
  weaponYaw:a.heading,stability:.55,recoil:0,lastShotAt:-100,
  lastBashAt:-100,lastBashRole:null,
  lastLaneWarnAt:-100,lastFireBlock:'clear',
  fireMode:'point',burstCount:0,skills:{...DEFAULT_SKILLS},
  firePolicy:'engage',suppressPoint:null,focusTargetId:null,
  weapon:'carbine',injuryStage:0,defense:null,watch:null,
  defenseUntil:0,surrendered:false,lastFireRepositionAt:-100,
});
/** Omitted seed keeps 052's historic static study for regression tests.
 * The actual game passes a unique seed on each newly loaded site.
 */
export function newSession(index=0,siteSeed?:number,
  intelMode:IntelMode='floor-plan'):Session{
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
      a.weapon=(['carbine','smg','rifle','shotgun'] as const)[i];
      a.magazine=WEAPONS[a.weapon].capacity;
      a.reserve=WEAPONS[a.weapon].reserve;
      a.insertedMagazineId=a.id+'/'+a.weapon+'/loaded';
      a.spareMagazines=a.weapon==='shotgun'?[]:magazineKit(
        a.id,a.weapon,a.reserve,WEAPONS[a.weapon].capacity);
      a.health=4;a.injuryStage=0;
      a.p={...site.spawn[i]};a.heading=-Math.PI/2;
      a.weaponYaw=a.heading;
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
      a.weaponYaw=a.heading;
      a.health=enemyRng()<.18?3:4;
      a.weapon=enemyRng()<.30?'smg':'carbine';
      a.magazine=WEAPONS[a.weapon].capacity;
      a.reserve=WEAPONS[a.weapon].reserve;
      a.insertedMagazineId=a.id+'/'+a.weapon+'/loaded';
      a.spareMagazines=magazineKit(a.id,a.weapon,a.reserve,
        WEAPONS[a.weapon].capacity);
      a.injuryStage=0;
      a.personality=(['guard','aggressor','cautious'] as const)[Math.floor(enemyRng()*3)];
      a.morale=.48+enemyRng()*.52;
    }
  }else operators.filter(a=>a.side==='red').forEach((a,i)=>{
    const pos=sample.spots[i];a.p={x:pos.x,y:pos.y};a.heading=pos.h;
    a.health=2;a.magazine=10;a.reserve=30;a.weaponYaw=a.heading;
    a.spareMagazines=magazineKit(a.id,a.weapon,a.reserve,
      WEAPONS[a.weapon].capacity);
  });
  const state:Session={...seed,operators,doors:initialDoors().map(initDoor),variant,nextId:1,
    scenario:{index:variant,name:site?.name??sample.name,
      objective:clone(site?.objective??OBJECTIVE),
      extract:clone(site?.extract??EXTRACTION)},
    mission:'clear',noise:[],shots:[],casings:[],nextShotId:1,known:new Map(),
    seenGround:new Set(),intel:initialIntel(intelMode,site,initialDoors()),
    intelObservedAt:-1,timesPaused:0,deaths:0,started:false,
    syncCode:0,report:[],movementNoiseAt:0,site,
    dropped:[],grenades:[],flashBursts:[],flashRemaining:2,nextEffectId:1,
    impactMarks:[],battleEvents:[],nextBattleId:1,
    missionType:site?(['clear','intel','rescue','hold','capture'] as const)[site.seed%5]:'clear',
    holdTime:0,rescue:null,captureTarget:null,captureSecured:false};
  if(state.missionType==='capture'){
    const target=operators.find(a=>a.side==='red');
    state.captureTarget=target?.id??null;
    if(target)state.scenario.objective=clone(target.p);
  }
  if(state.missionType==='rescue')
    state.rescue={p:clone(state.scenario.objective),following:null};
  if(state.missionType==='intel'||state.missionType==='rescue'||
     state.missionType==='hold')state.mission='secure';
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
  if(kind==='move'&&!intelPassable(p,s.intel))return false;
  if(kind==='move'&&!routeWithIntel(s.intel,finalPoint(a),p).length)return false;
  if(kind==='door'&&(!passable(p)||!route(finalPoint(a),p).length))return false;
  return edit(s,a,()=>{
    a.plan.push({id:s.nextId++,kind,p:clone(p),...extra});
  });
}
export function planMove(s:Session,id:string,p:Pt,strafe=false){
  const a=party(s,id);
  if(!a)return false;
  const extra=strafe?{moveMode:'strafe' as const,
    facing:[...a.plan].reverse().find(n=>n.facing!==undefined)?.facing??a.heading}:{};
  const target=projectReachableGoal(finalPoint(a),p,{
    canStand:at=>intelPassable(at,s.intel),
    routeTo:(from,to)=>routeWithIntel(s.intel,from,to),
  });
  if(!target)return false;
  if(target.adjusted)notify(s,'POSITION ADJUSTED TO WALKABLE GROUND');
  return addNode(s,id,'move',target.point,extra);
}
/** A finger-drawn path is one undoable gesture, while BACK removes one node. */
export function planMoveStroke(s:Session,id:string,points:Pt[],strafe=false){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed:PlanNode[]=[];
  let from=finalPoint(a);
  const facing=[...a.plan].reverse().find(n=>n.facing!==undefined)?.facing??a.heading;
  for(const point of points.slice(0,60)){
    if(d(from,point)<20||!intelPassable(point,s.intel)||
      !routeWithIntel(s.intel,from,point).length)continue;
    proposed.push({id:s.nextId+proposed.length,kind:'move',p:clone(point),
      ...(strafe?{moveMode:'strafe' as const,facing}:{})});
    from=point;
  }
  if(!proposed.length)return false;
  // Door actions inserted during one stroke remain one undoable edit.
  const expanded:PlanNode[]=[];let prior=finalPoint(a);
  const opened=new Set(a.plan.filter(n=>n.kind==='door'&&(n.method==='open'||n.method==='kick'))
    .map(n=>n.doorId??''));
  for(const node of proposed){
    const points=[prior,...routeWithIntel(s.intel,prior,node.p)];
    for(let i=1;i<points.length;i++)
      for(const door of s.doors){
        if(!doorKnown(s.intel,door.id)||
           (s.intel.doorMemory.get(door.id)??0)>=.72||
           opened.has(door.id)||
           !segmentsCross({a:points[i-1],b:points[i]},door))continue;
        const staging=doorApproach(prior,door);
        if(!staging)continue;
        expanded.push({id:s.nextId+expanded.length,kind:'door',
          p:clone(staging),doorId:door.id,method:'open'});
        opened.add(door.id);
      }
    expanded.push({...node,id:s.nextId+expanded.length});
    prior=node.p;
  }
  return edit(s,a,()=>{a.plan.push(...expanded);s.nextId+=expanded.length;});
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
    if(!doorReachable(finalPoint(a),door))return planDoor(s,id,doorId,method);
    return addNode(s,id,'door',finalPoint(a),{doorId,method});
  }
  const index=a.plan.findIndex(n=>n.id===nodeId);
  if(index<0||!doorReachable(a.plan[index].p,door))return false;
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
      if(n.kind==='move'?!intelPassable(n.p,s.intel)||
        !routeWithIntel(s.intel,from,n.p).length:
        !passable(n.p)||!route(from,n.p).length)return false;
      from=n.p;
    }
  }
  return true;
}
export function movePlanNode(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed=copyNodes(a.plan);
  const index=proposed.findIndex(n=>n.id===nodeId);
  if(index<0)return false;
  const changed=proposed[index];
  if(changed.kind==='pie')return false;
  let point=p;
  if(changed.kind==='move'){
    const from=index>0?proposed[index-1].p:a.p;
    const target=projectReachableGoal(from,p,{
      canStand:at=>intelPassable(at,s.intel),
      routeTo:(origin,goal)=>routeWithIntel(s.intel,origin,goal),
    });
    if(!target)return false;
    point=target.point;
  }
  if(!modifyNode(proposed,nodeId,{p:point}))return false;
  if(changed.kind==='door'){
    const doorway=s.doors.find(door=>door.id===changed.doorId);
    if(!doorway||!intelPassable(point,s.intel)||
      d(point,doorCenter(doorway))>43)return false;
  }
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
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const position=clamp(index,0,a.plan.length);
  const from=position>0?a.plan[position-1].p:a.p;
  const target=projectReachableGoal(from,p,{
    canStand:at=>intelPassable(at,s.intel),
    routeTo:(origin,goal)=>routeWithIntel(s.intel,origin,goal),
  });
  if(!target)return false;
  const proposed=copyNodes(a.plan);
  proposed.splice(position,0,{id:s.nextId,kind:'move',p:clone(target.point)});
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
  label:'look'|'strafe'|'pie'=mode==='track'?'pie':'look',
  origin:'end'|'here'='end'){
  const a=party(s,id);
  if(!a||!canEdit(s)||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  const pos=node?.p??(origin==='here'?a.p:finalPoint(a));
  if(d(pos,target)<2)return false;
  const patch:Partial<PlanNode>=mode==='track'?
    {aimMode:'track',facing:undefined,aimPoint:clone(target),aimLabel:label}:
    {aimMode:mode,facing:angle(pos,target),aimPoint:undefined,aimLabel:label};
  if(node)return edit(s,a,()=>{
    node.aimMode=patch.aimMode;node.facing=patch.facing;
    node.aimPoint=patch.aimPoint;node.aimLabel=patch.aimLabel;
  });
  if(origin==='here')return edit(s,a,()=>{
    a.plan.unshift({id:s.nextId++,kind:'look',p:clone(a.p),...patch});
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
  const position=doorApproach(finalPoint(a),door);
  return !!position&&addNode(s,id,'door',position,{doorId,method});
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
  const start=finalPoint(alive[0]);
  const slots=entryLanes(door,start,alive.length,passable);
  if(slots.length!==alive.length){
    notify(s,'SQUAD ENTRY BLOCKED · NO DISTINCT INTERIOR LANES');
    return false;
  }
  // Preflight all interior destinations before editing anyone's plan.
  for(let i=0;i<alive.length;i++){
    if(!routeWithIntel(s.intel,finalPoint(alive[i]),slots[i].point).length){
      notify(s,'SQUAD ENTRY BLOCKED · CHECK ROUTE');
      return false;
    }
  }
  for(const a of alive){
    if(!a.plan.some(n=>n.stackDoorId===doorId)&&
      !planStack(s,a.id,doorId))return false;
  }
  if(!planSync(s))return false;
  const lead=alive[0];
  if(!planDoor(s,lead.id,doorId,'open'))return false;
  for(let i=0;i<alive.length;i++){
    const a=alive[i],slot=slots[i];
    if(i>0)planWait(s,a.id,.3+i*.24);
    if(!planMove(s,a.id,slot.point)){
      notify(s,a.name+' ENTRY ROUTE UNAVAILABLE');
      return false;
    }
    const arrival=a.plan.at(-1);
    if(arrival?.kind==='move')
      planAim(s,a.id,'fixed',slot.look,arrival.id,'look');
  }
  notify(s,'SQUAD ENTRY READY · DISTINCT LANES · GO TO EXECUTE');
  return true;
}
/** Tactical WAIT: hold for the minimum interval, and continue only after
 * any visible living contact has been absent for that entire interval.
 * Legacy holdClear nodes execute identically for old plans/replays. */
export function planWaitAt(s:Session,id:string,seconds=.5,
  origin:'here'|'end'='here',afterNodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const after=afterNodeId===undefined?-1:
    a.plan.findIndex(n=>n.id===afterNodeId);
  if(afterNodeId!==undefined&&after<0)return false;
  if(afterNodeId!==undefined||origin==='here'){
    const point=afterNodeId!==undefined?a.plan[after].p:a.p;
    return edit(s,a,()=>a.plan.splice(after+1,0,{
      id:s.nextId++,kind:'wait',p:clone(point),
      duration:clamp(seconds,.3,6)}));
  }
  return planWait(s,id,seconds);
}
export function setWaitDuration(s:Session,id:string,nodeId:number,seconds:number){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||node.kind!=='wait'||!canEdit(s))return false;
  return edit(s,a,()=>{node.duration=clamp(seconds,.3,6);});
}
/** Posture and pace authored at an existing waypoint take effect on arrival
 * and remain until a later transition. An operator tap edits base/HERE state. */
/** Fire policy is persistent until changed. A waypoint can override it
 * without touching navigation or the rest of the authored plan. */
export function setFirePolicy(s:Session,id:string,policy:FirePolicy,
  nodeId?:number,point?:Pt,targetId?:string):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  if(policy==='suppress'&&(!point||
    !Number.isFinite(point.x)||!Number.isFinite(point.y)))return false;
  if(policy==='focus'){
    const target=enemies(s).find(e=>e.id===targetId&&
      e.health>0&&isSeen(s,e));
    if(!target)return false;
  }
  const change=()=>{
    if(node){
      node.firePolicyState=policy;
      node.firePoint=point?clone(point):undefined;
      node.fireTargetId=targetId;
    }else{
      a.firePolicy=policy;a.suppressPoint=point?clone(point):null;
      a.focusTargetId=targetId??null;
    }
  };
  return edit(s,a,change);
}
export function setNodeControl(s:Session,id:string,nodeId:number,
  field:'postureState'|'paceState',value:'stand'|'crouch'|'walk'|'run'){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||!canEdit(s))return false;
  return edit(s,a,()=>{Object.assign(node,{[field]:value});});
}
export function setStartPace(s:Session,id:string,pace:'walk'|'run'){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  a.pace=pace;return true;
}
export function plannedControl(s:Session,id:string,nodeId?:number){
  const a=party(s,id);if(!a)return {posture:'stand' as Posture,
    pace:'walk' as const};
  let posture=a.posture,pace=a.pace;
  if(nodeId===undefined)return {posture,pace};
  for(const node of a.plan){
    if(node.postureState)posture=node.postureState;
    if(node.paceState)pace=node.paceState;
    if(node.id===nodeId)break;
  }
  return {posture,pace};
}
export function setMoveSprint(s:Session,id:string,nodeId:number){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||node.kind!=='move'||!canEdit(s))return false;
  return edit(s,a,()=>{
    node.moveMode=node.moveMode==='sprint'?'advance':'sprint';
  });
}
export function planHoldClear(s:Session,id:string,origin:'here'|'end'='end',afterNodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const idx=afterNodeId===undefined?-1:a.plan.findIndex(n=>n.id===afterNodeId);
  if(afterNodeId!==undefined&&idx<0)return false;
  const p=idx>=0?a.plan[idx].p:origin==='here'?a.p:finalPoint(a);
  if(idx>=0||origin==='here')return edit(s,a,()=>{
    a.plan.splice(idx+1,0,{id:s.nextId++,kind:'holdClear',p:clone(p),duration:.5});
  });
  return addNode(s,id,'holdClear',p,{duration:.5});
}
export function planWait(s:Session,id:string,seconds=.5){
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
/** The weapon, hand and world share one magazine identity.
 * Ammo moves only at timed detach/insert events, never on animation startup. */
export function beginReload(s:Session,a:TeamActor):boolean{
  const w=WEAPONS[a.weapon];
  if(a.health<=0||a.reload>0||a.reserve<=0||a.magazine>=w.capacity)return false;
  if(a.weapon!=='shotgun'&&!a.spareMagazines.length)
    a.spareMagazines=magazineKit(a.id,a.weapon,a.reserve,w.capacity);
  const mode:ReloadMode=a.weapon==='shotgun'?'shells':
    a.magazine===0?'emergency':'retention';
  a.reloadMode=mode;a.reloadStartedAt=s.seconds;
  a.reloadDuration=reloadTiming(w.reload,injuryReload(a.injuryStage),
    mode,w.capacity-a.magazine);
  a.reload=a.reloadDuration;a.reloadRemoved=false;
  a.reloadInserted=false;a.reloadFromRounds=a.magazine;
  a.reloadTargetRounds=Math.min(w.capacity-a.magazine,a.reserve);
  a.aim=0;
  notify(s,a.name+' '+(mode==='retention'?'RETENTION RELOAD':
    mode==='shells'?'LOADING SHELLS':'EMERGENCY RELOAD'));
  battleEvent(s,'reload',a,a.p,a.name+' RELOAD');
  return true;
}
export function advanceReload(s:Session,a:TeamActor,dt:number){
 if(a.reload<=0||!a.reloadMode)return;
 const mode=a.reloadMode,old=a.reload;
 a.reload=Math.max(0,a.reload-dt);
 const t=a.reloadDuration>0?1-a.reload/a.reloadDuration:1;
 if(mode==='shells'){
   const staged=Math.min(a.reloadTargetRounds,Math.max(0,
     Math.floor(Math.max(0,t-.20)/.68*a.reloadTargetRounds)));
   const inserted= a.magazine-a.reloadFromRounds;
   const add=Math.max(0,staged-inserted);
   if(add){
     a.magazine+=add;a.reserve-=add;
   }
 }else{
   if(!a.reloadRemoved&&t>=.29){
     a.reloadRemoved=true;
     const oldRounds=a.magazine;
     a.magazine=0;
     const oldId=a.insertedMagazineId;
     a.insertedMagazineId='';
     if(mode==='retention'&&oldRounds>0){
       a.spareMagazines.push({id:oldId,weapon:a.weapon,rounds:oldRounds});
       a.reserve+=oldRounds;
     }else{
       s.dropped.push({id:s.nextEffectId++,p:clone(a.p),
         side:a.side,age:0,weapon:a.weapon,rounds:oldRounds,
         magazineId:oldId});
       if(s.dropped.length>48)s.dropped.shift();
     }
   }
   if(!a.reloadInserted&&t>=.82){
     const index=fullestMagazineIndex(a.spareMagazines,a.weapon);
     if(index>=0){
       const mag=a.spareMagazines.splice(index,1)[0];
       a.magazine=mag.rounds;a.reserve-=mag.rounds;
       a.insertedMagazineId=mag.id;
     }
     a.reloadInserted=true;
   }
 }
 if(old>0&&a.reload===0){
   if(mode==='shells'){
     const missing=Math.min(a.reloadTargetRounds,
       a.reloadFromRounds+a.reloadTargetRounds-a.magazine);
     if(missing>0){a.magazine+=missing;a.reserve-=missing;}
   }
   a.reloadMode=null;
   a.reloadInserted=true;
   notify(s,a.name+' RELOADED');
 }
}
/** A tap near a jamb is aiming intent, not a demand for subpixel precision.
 * Snap only to a small, genuinely walkable/throw-reachable nearby patch. */
function snapFlashTarget(from:Pt,target:Pt,doors:Door[],
  opened:string[]):Pt|null{
  const choices:Pt[]=[target];
  for(const r of [5,9,13,17])
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      choices.push({x:target.x+Math.cos(angle)*r,
        y:target.y+Math.sin(angle)*r});
    }
  return choices.find(p=>passable(p,3.5)&&
    validateThrow(from,p,doors,opened).valid)??null;
}
/** Two team-wide flashbangs per mission. Throwing is an authored timed order. */
export function planFlash(s:Session,id:string,target:Pt):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s))return false;
  const queued=team(s).reduce((n,x)=>n+
    x.plan.filter(node=>node.kind==='flash').length,0);
  const start=finalPoint(a);
  if(queued>=s.flashRemaining)return false;
  const plannedOpen=a.plan.filter(n=>n.kind==='door'&&(n.method==='open'||n.method==='kick'))
    .map(n=>n.doorId??'');
  const landing=snapFlashTarget(start,target,s.doors,plannedOpen);
  if(!landing)return false;
  return addNode(s,id,'flash',start,{aimPoint:clone(landing)});
}
/** Door-context FLASH: one undoable sequence. OPEN is inserted ahead of
 * the throw; never auto-enters. Target validation treats only this door
 * and previously planned opened doors as passable. */
export function planDoorFlash(s:Session,id:string,doorId:string,target:Pt,
  afterNodeId?:number):boolean{
  const a=party(s,id),door=s.doors.find(d=>d.id===doorId);
  if(!a||!door||!canEdit(s)||
    !doorKnown(s.intel,doorId))return false;
  const queued=team(s).reduce((sum,x)=>sum+
    x.plan.filter(n=>n.kind==='flash').length,0);
  if(queued>=s.flashRemaining)return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<0)return false;
  const start=index>0?a.plan[index-1].p:a.p;
  const approached=doorReachable(start,door)?clone(start):doorApproach(start,door);
  if(!approached||!passable(approached)||
     !route(start,approached).length)return false;
  const before=a.plan.slice(0,index);
  const opened=before.filter(n=>n.kind==='door'&&(n.method==='open'||n.method==='kick'))
    .map(n=>n.doorId??'');
  const needsOpen=!opened.includes(doorId)&&
    (s.intel.doorMemory.get(doorId)??0)<.72;
  const landing=snapFlashTarget(approached,target,s.doors,
    needsOpen?[...opened,doorId]:opened);
  if(!landing)return false;
  return edit(s,a,()=>{
    const added:PlanNode[]=[];
    if(needsOpen)added.push({id:s.nextId++,kind:'door',
      p:clone(approached),doorId,method:'open'});
    added.push({id:s.nextId++,kind:'flash',p:clone(approached),
      aimPoint:clone(landing)});
    a.plan.splice(index,0,...added);
  });
}
/** Dragging a flash marker changes its landing point, not the thrower's position. */
export function moveFlashTarget(s:Session,id:string,nodeId:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const candidate=a.plan.find(n=>n.id===nodeId&&n.kind==='flash');
  if(!candidate)return false;
  const index=a.plan.indexOf(candidate);
  const opened=a.plan.slice(0,index).filter(n=>n.kind==='door'&&
    (n.method==='open'||n.method==='kick')).map(n=>n.doorId??'');
  const landing=snapFlashTarget(candidate.p,p,s.doors,opened);
  if(!landing)return false;
  return edit(s,a,()=>{candidate.aimPoint=clone(landing);});
}
export function flashTrajectory(s:Session,a:TeamActor,node:PlanNode):ThrowPath|null{
  if(node.kind!=='flash'||!node.aimPoint)return null;
  const index=a.plan.findIndex(n=>n.id===node.id);
  const open=a.plan.slice(0,index).filter(n=>n.kind==='door'&&
    (n.method==='open'||n.method==='kick')).map(n=>n.doorId??'');
  return validateThrow(node.p,node.aimPoint,s.doors,open);
}
function battleEvent(s:Session,kind:BattleEvent['kind'],a:TeamActor|null,p:Pt,text:string){
  s.battleEvents.push({id:s.nextBattleId++,kind,t:s.seconds,
    actor:a?.id,p:clone(p),text});
  if(s.battleEvents.length>500)s.battleEvents.shift();
}
export function cycleWeapon(s:Session,id:string):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const ids:WeaponId[]=['carbine','smg','rifle','shotgun'];
  const next=ids[(ids.indexOf(a.weapon)+1)%ids.length];
  a.weapon=next;a.magazine=WEAPONS[next].capacity;
  a.reserve=WEAPONS[next].reserve;a.reload=0;a.aim=0;
  a.insertedMagazineId=a.id+'/'+next+'/loaded';
  a.spareMagazines=next==='shotgun'?[]:magazineKit(
    a.id,next,a.reserve,WEAPONS[next].capacity);
  a.reloadMode=null;a.reloadRemoved=false;a.reloadInserted=false;
  notify(s,a.name+' EQUIPPED '+WEAPONS[next].label);
  return true;
}
export function planReload(s:Session,id:string):boolean{
  const a=party(s,id);
  return !!a&&canEdit(s)&&addNode(s,id,'reload',finalPoint(a));
}
/** Insert reload at the selected HERE/waypoint, without moving the route. */
export function planReloadAt(s:Session,id:string,afterNodeId?:number){
 const a=party(s,id);if(!a||!canEdit(s))return false;
 const index=afterNodeId===undefined?0:a.plan.findIndex(n=>n.id===afterNodeId)+1;
 if(index<0)return false;
 const p=index===0?a.p:a.plan[index-1].p;
 return edit(s,a,()=>a.plan.splice(index,0,{id:s.nextId++,
   kind:'reload',p:clone(p)}));
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
  if(s.doors.some(w=>doorBlocksSegment(w,ray)))return false;
  // Exact slab intersection replaces dozens of short ray samples per
  // visibility query. Geometry remains authoritative at any framerate.
  return !COVER.some(o=>(!o.low||lowBlocks)&&segmentHitsBox(a,b,o));
}
export function inSight(a:TeamActor,b:TeamActor,s:Session){
  if(a.health<=0||b.health<=0||d(a.p,b.p)>240)return false;
  const delta=angleDifference(a.heading,angle(a.p,b.p));
  if(Math.abs(delta)>.94)return false;
  return !exposure(a.p,b.p,s.doors,
    b.posture==='crouch',a.posture==='crouch').blocked;
}
export const isSeen=(s:Session,target:TeamActor)=>
  team(s).some(a=>inSight(a,target,s));
export function lastKnown(s:Session,id:string){
  return s.known.get(id)??null;
}
function observe(s:Session){
  const updateGround=s.intelObservedAt<0||
    s.seconds-s.intelObservedAt>=.14;
  if(updateGround){
    observeIntel(s.intel,s.site,s.doors,p=>liveVisibility(s,p));
    s.intelObservedAt=s.seconds;
  }
  // Site knowledge persists, current knowledge does not. Sight has geometry,
  // distance and facing: invisible opponents never leak through the UI.
  for(const blue of team(s)){
    if(blue.health<=0)continue;
    // Remember every small patch actually seen, including areas that
    // fall between the old 40-unit sample points when pieing a room.
    // Do this at an intel cadence, not on every 60 Hz sim tick.
    if(updateGround){
      const minX=Math.max(0,Math.floor((blue.p.x-240)/20));
      const maxX=Math.min(31,Math.floor((blue.p.x+240)/20));
      const minY=Math.max(0,Math.floor((blue.p.y-240)/20));
      const maxY=Math.min(36,Math.floor((blue.p.y+240)/20));
      for(let row=minY;row<=maxY;row++)
        for(let col=minX;col<=maxX;col++){
          const p={x:col*20+10,y:row*20+10};
          const theta=angle(blue.p,p);
          if(d(blue.p,p)>=240||
            Math.abs(angleDifference(blue.heading,theta))>=1.15||
            !unobstructed(blue.p,p,s,blue.posture==='crouch'))continue;
          s.seenGround.add('fine:'+col+','+row);
          // Keep legacy coarse memories for knownAt and existing intel UI.
          s.seenGround.add(Math.floor(p.x/40)+','+
            Math.floor(p.y/40));
        }
      // Fine independent explored footprints: 10-unit samples capture the
      // visible margins of corners that 20-unit center samples missed.
      // Stored in replay snapshots alongside the legacy coarse keys.
      const x0=Math.max(0,Math.floor((blue.p.x-240)/10));
      const x1=Math.min(63,Math.floor((blue.p.x+240)/10));
      const y0=Math.max(0,Math.floor((blue.p.y-240)/10));
      const y1=Math.min(73,Math.floor((blue.p.y+240)/10));
      for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++){
        const p={x:col*10+5,y:row*10+5};
        if(d(blue.p,p)>=240||
          Math.abs(angleDifference(blue.heading,angle(blue.p,p)))>=1.15||
          !unobstructed(blue.p,p,s,blue.posture==='crouch'))continue;
        s.seenGround.add(MICRO_KEYS[row*MICRO_COLS+col]);
      }
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
    if(s.operators.some(b=>b!==blocker&&b!==requester&&b.health>0&&
      d(pos,b.p)<18))return false;
    return sweptBodyClear(blocker.p,pos,s.doors);
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
  if(blockerActive&&blocker.blockedTime<.14&&blocker.velocity>12)
    return false;
  if(blockerActive&&blocker.blockedTime>.14&&requesterRank>blockerRank)
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
    if(sweptBodyClear(a.p,candidate,s.doors)){
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
    a.nav=a.side==='blue'?routeWithIntel(s.intel,a.p,p):route(a.p,p);
    if(!a.nav.length){
      // A failed route is a stationary brace, not phantom walking speed.
      a.velocity=0;a.blockedTime+=dt;a.lastBlocker='route';
      if(s.seconds-a.lastNavRepairAt>1.2){
        notify(s,a.name+' CANNOT REACH');
        a.lastNavRepairAt=s.seconds;
      }
      return false;
    }
  }
  const next=a.nav[0],gap=d(a.p,next);
  if(gap<3){a.nav.shift();return false;}
  const direction=angle(a.p,next);
  const movingSpeed=a.side==='blue'?75:62;
  const suppression=clamp(1-a.suppression*.4,.45,1);
  const requested=movingSpeed*(a.posture==='crouch'?.58:1)*suppression*
    speedScale*injurySpeed(a.injuryStage);
  // A lateral shuffle cannot use the same stride speed as forward running.
  // Scale the limit continuously for diagonal travel, preserving ordinary
  // forward movement and crouch/injury speed reductions.
  const lateral=Math.abs(Math.sin(direction-a.heading));
  const sideLimit=(38+37*(1-lateral*lateral))*
    (a.posture==='crouch'?.58:1)*injurySpeed(a.injuryStage);
  const desired=Math.min(requested,sideLimit);
  a.velocity+=(desired-a.velocity)*Math.min(1,dt*6);
  const advance=Math.min(gap,a.velocity*dt);
  const move={x:a.p.x+Math.cos(direction)*advance,
    y:a.p.y+Math.sin(direction)*advance};
  // Push an open leaf as soon as the body touches it, not only when
  // the centre line crosses it (which was too late to escape collision).
  const closedDoor=s.doors.find(door=>
    pointToSegment(move,doorLeafSegment(door))<15||
    doorBlocksSegment(door,{a:a.p,b:move}));
  if(closedDoor?.open&&(closedDoor.openFraction??0)<.99){
    // Sustained contact at the latch generates more torque than at the
    // hinge; an already open door can always be pushed toward its stop.
    const impulse=doorContactImpulse(closedDoor,move);
    if(impulse>0)pushDoor(closedDoor,2.5*impulse);
  }
  // Look ahead to the route's next node, stopping to open a door before
  // the actor's capsule contacts the physical leaf.
  const doorAhead=a.side==='red'?s.doors.find(door=>{
    if(door.open&&(door.openFraction??0)>=.72)return false;
    const center=doorCenter(door);
    return d(a.p,center)<52&&
      (doorBlocksSegment(door,{a:a.p,b:next})||
       d(next,center)<22);
  }):undefined;
  if(doorAhead){
    if(doorAhead.heldBy){a.velocity=0;return true;}
    a.velocity=0;a.actionTimer+=dt;
    if(a.actionTimer>=.36&&!doorAhead.open){
      doorAhead.open=true;doorAhead.openedAt=s.seconds;
      hear(s,doorCenter(doorAhead),125,'door');
      notify(s,a.name+' OPENED '+doorAhead.id);
    }
    if((doorAhead.openFraction??0)<.72)return true;
    a.actionTimer=0;
  }else if(a.side==='red')a.actionTimer=0;
  // Only one operator owns a narrow threshold at a time. This is a
  // transient execution pause, not a new waypoint or permanent yield.
  const traffic:PassageActor[]=s.operators.map(unit=>({
    id:unit.id,p:unit.p,goal:unit===a?p:
      unit.nav.at(-1)??unit.plan[0]?.p??null,
    health:unit.health,blockedTime:unit.blockedTime,
    active:unit===a||unit.nav.length>0||
      unit.plan.some(n=>n.kind==='move'||n.kind==='door'||n.kind==='pie'),
  }));
  if(passageWait(traffic.find(unit=>unit.id===a.id)!,s.doors,traffic)){
    a.velocity=0;a.blockedTime=0;
    return true;
  }
  const closed=!!closedDoor&&!closedDoor.open&&
    pointToSegment(move,doorLeafSegment(closedDoor))<9.5&&
    pointToSegment(move,doorLeafSegment(closedDoor))<
      pointToSegment(a.p,doorLeafSegment(closedDoor))+0.001;
  // Allies may brush and pass one another: their bodies never hard-block
  // authored routes. Only an opposing actor is a physical traffic barrier.
  const blocking=s.operators.find(b=>b!==a&&b.health>0&&
    b.side!==a.side&&d(b.p,move)<11);
  const nearPeer=s.operators.find(b=>b!==a&&b.health>0&&
    b.side===a.side&&d(b.p,move)<20);
  if(nearPeer&&a.side==='blue'&&!nearPeer.plan.length&&
    d(a.p,nearPeer.p)<27)deferToTeammate(s,nearPeer,a);
  let desiredMove=move;
  if(nearPeer){
    const tangent={x:-Math.sin(direction),y:Math.cos(direction)};
    const choices=[.4,-.4,.7,-.7].map(factor=>({
      x:move.x+tangent.x*advance*factor,
      y:move.y+tangent.y*advance*factor,
    })).filter(pos=>d(pos,nearPeer.p)>d(move,nearPeer.p)+2&&
      sweptBodyClear(a.p,pos,s.doors));
    if(choices.length)desiredMove=choices.sort((u,v)=>
      d(u,next)-d(v,next))[0];
  }
  // Try nearby route repair for actor jams, furniture, and door leaves.
  if((!sweptBodyClear(a.p,desiredMove,s.doors)||blocking)&&
    a.blockedTime>.30&&s.seconds-a.lastNavRepairAt>.6){
    const candidate=localDetour(a.p,next,s.doors,s.operators
      .filter(o=>o!==a&&o.health>0).map(o=>o.p));
    if(candidate&&d(candidate,p)<d(a.p,p)+12&&
      (!a.nav.length||d(candidate,a.nav[0])>12)){
      a.nav.unshift(candidate);a.lastNavRepairAt=s.seconds;
      return true;
    }
  }
  if(!closed&&!blocking&&sweptBodyClear(a.p,desiredMove,s.doors)){
    a.priorP=clone(a.p);a.p=desiredMove;a.blockedTime=0;
    a.lastBlocker='clear';
    if(a.side==='blue'&&s.seconds-s.movementNoiseAt>.54){
      hear(s,a.p,a.posture==='crouch'?30:68,'footstep');
      s.movementNoiseAt=s.seconds;
    }
  }else{
    a.velocity=Math.max(0,a.velocity-dt*130);
    a.blockedTime+=dt;
    a.lastBlocker=diagnoseMovement(a.p,desiredMove,s.doors,
      s.operators.filter(b=>b!==a&&b.side!==a.side&&b.health>0)
      .map(b=>b.p)).blocker;
    if(a.side==='blue'&&a.lastBlocker==='furniture'){
      const newlyKnown=discoverContactCover(s.intel,a.p,13);
      if(newlyKnown.length){
        a.lastNavRepairAt=-10;
        notify(s,a.name+' DISCOVERED OBSTRUCTION');
      }
    }
    if(a.blockedTime>1&&a.blockedTime<1.1)
      notify(s,a.name+' BLOCKED · '+a.lastBlocker.toUpperCase());
    if(a.blockedTime>1.25&&s.seconds-a.lastNavRepairAt>1.2){
      a.lastNavRepairAt=s.seconds;
      // Once actual collision is observed, repair against real geometry,
      // not only the incomplete player-intel route that may run through
      // an undiscovered door frame. The authored final goal is unchanged.
      const repaired=route(a.p,p);
      if(repaired.length)a.nav=repaired;
      else if(a.side==='blue')a.nav=routeWithIntel(s.intel,a.p,p);
    }
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
  if(a.yieldTarget&&stepYield(s,a,dt)){
    const held=aimHeading(a);
    if(held!==null)rotate(a,held,dt);
    return;
  }
  // A stationary or opposing teammate may briefly step aside, then resume
  // its original queue. This overrides motor movement, not tactical aiming.
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
    // A persistent tracking/PIE stance stays cautious on every segment,
    // not only on explicitly marked strafe nodes.
    const tracking=a.aimInstruction?.mode==='track'||
      n.aimMode==='track';
    const cautious=n.moveMode==='strafe'||tracking;
    approach(a,n.p,dt,s,n.moveMode==='sprint'||a.pace==='run'?1.40:
      cautious?.70:1);
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
  if(at){
    if(n.postureState)a.posture=n.postureState;
    if(n.paceState)a.pace=n.paceState;
    if(n.firePolicyState){
      a.firePolicy=n.firePolicyState;
      a.suppressPoint=n.firePoint?clone(n.firePoint):null;
      a.focusTargetId=n.fireTargetId??null;
    }
  }
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
  if(n.kind==='holdClear'||n.kind==='wait'){
    // One WAIT: stay at least .5s and keep waiting while a live,
    // physically seen contact is present. Clear timer resets on sight.
    const contact=enemies(s).some(e=>e.health>0&&inSight(a,e,s));
    a.waitRemaining=contact?0:a.waitRemaining+dt;
    a.velocity=0;
    if(a.waitRemaining>=(n.duration??.5))pop(a);
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
    // The authored order owns one reload, not an endless sequence of
    // refills when the final available magazine isn't completely full.
    if(a.actionTimer>0&&a.reload===0){pop(a);return;}
    if(a.actionTimer===0){
      if(!beginReload(s,a)){pop(a);return;}
      a.actionTimer=dt;
    }
    return;
  }
  if(n.kind==='flash'){
    if(!n.aimPoint||s.flashRemaining<=0){pop(a);return;}
    const trajectory=validateThrow(a.p,n.aimPoint,s.doors);
    if(!trajectory.valid){
      notify(s,a.name+' FLASH BLOCKED — '+(trajectory.reason??'CHECK TRAJECTORY'));
      a.velocity=0;return;
    }
    a.velocity=0;rotate(a,angle(a.p,n.aimPoint),dt);
    a.actionTimer+=dt;
    if(a.actionTimer>=.3){
      s.flashRemaining--;a.lastThrowAt=s.seconds;
      s.grenades.push({id:s.nextEffectId++,p:clone(a.p),
        from:clone(a.p),to:clone(n.aimPoint),age:0,fuse:1.15,
        path:trajectory});
      battleEvent(s,'flash',a,a.p,a.name+' FLASH OUT');
      notify(s,a.name+' FLASH OUT');
      pop(a);
    }
    return;
  }
  if(n.kind==='door'){
    const door=s.doors.find(d=>d.id===n.doorId);
    if(!door||(n.method==='close'&&!door.open)||
       (n.method!=='close'&&n.method!=='kick'&&n.method!=='hold'&&door.open)){
      pop(a);return;
    }
    if(!doorReachable(a.p,door)&&a.actionTimer===0){
      notify(s,a.name+' TOO FAR FROM DOOR');return;
    }
    const required=n.method==='kick'?KICK_DURATION:
      n.method==='hold'?1.3:n.method==='close'?.65:.49;
    if(a.actionTimer===0){
      a.lastDoorAt=s.seconds;a.lastDoorId=door.id;
      a.lastDoorMethod=n.method??'open';
    }
    a.actionTimer+=dt;
    if(n.method==='kick'&&a.actionTimer>=required*.53){
      if(!door.open){
        door.open=true;door.openedAt=s.seconds;
        kickDoor(door);
        hear(s,doorCenter(door),340,'kick');
        notify(s,door.id+' KICKED');
        battleEvent(s,'door',a,doorCenter(door),door.id+' KICKED');
      }
    }
    if(a.actionTimer>=required){
      if(n.method==='hold'){
        if(door.open)notify(s,door.id+' MUST BE CLOSED TO HOLD');
        else{
          door.heldBy=a.id;
          notify(s,door.id+' BRACED');
          battleEvent(s,'door',a,doorCenter(door),door.id+' BRACED');
        }
        pop(a);return;
      }
      if(n.method==='close'){
        door.heldBy=null;door.open=false;door.openedAt=s.seconds;
        hear(s,doorCenter(door),90,'door');
        notify(s,door.id+' CLOSING');
        battleEvent(s,'door',a,doorCenter(door),door.id+' CLOSING');
      }else if(n.method!=='kick'){
        if(door.heldBy){notify(s,door.id+' BRACED SHUT');pop(a);return;}
        door.open=true;door.openedAt=s.seconds;
        pushDoor(door,.45);
        hear(s,doorCenter(door),145,'door');
        notify(s,door.id+' OPENED');
        battleEvent(s,'door',a,doorCenter(door),door.id+' OPENED');
      }
      pop(a);
    }
  }
}
function defensivePosition(a:TeamActor,from:Pt,s:Session):Pt|null{
  const others=enemies(s).map(other=>({id:other.id,p:other.p,
    health:other.health,defense:other.defense}));
  return chooseDefense(a.p,from,s.doors,others,a.id);
}
function enemyDecisions(s:Session,a:TeamActor,dt:number){
  if(a.health<=0||a.surrendered)return;
  if(!a.watch)a.watch=watchPoint(a.p,s.doors);
  const visible=team(s).filter(b=>inSight(a,b,s));
  if(visible.length){
    const b=visible.sort((x,y)=>d(x.p,a.p)-d(y.p,a.p))[0];
    a.contact=clone(b.p);a.alertUntil=s.seconds+3;a.contacted=true;
    a.watch=clone(b.p);
    if(a.suppression>.65&&a.alert!=='retreat'){
      a.retreatPoint=defensivePosition(a,b.p,s);
      if(a.retreatPoint){a.alert='retreat';a.nav=[];}
    }
    // An eye-level contact may be behind solid cover at muzzle height.
    // Reposition to an actual firing lane instead of staring at it while
    // repeatedly attempting blocked shots. Reposition has a cooldown.
    const friends=enemies(s).filter(o=>o!==a&&o.health>0).map(o=>o.p);
    const lane=assessFireLane(a.p,a.posture==='crouch'?18:26,
      b.p,aimHeight(b.posture==='crouch'),COVER,WALLS,s.doors,friends);
    if(lane.blocker!=='clear'&&a.alert!=='retreat'&&
      s.seconds-a.lastFireRepositionAt>2.6){
      const candidate=defensivePosition(a,b.p,s);
      a.lastFireRepositionAt=s.seconds;
      if(candidate&&d(candidate,a.p)>15){
        a.defense=candidate;a.alert='cover';a.nav=[];
        a.defenseUntil=s.seconds+3.2;
      }
    }
    const maneuvering=a.alert==='cover'&&a.defense&&
      d(a.p,a.defense)>10&&s.seconds<a.defenseUntil;
    if(a.alert!=='retreat'&&!maneuvering){
      a.alert='engaging';a.nav=[];
    }
  }else if(s.seconds>a.alertUntil&&a.alert!=='idle'&&
    a.alert!=='retreat'&&a.alert!=='cover'){
    a.alert='investigating';a.contact=a.heard??a.contact;
  }
  // AI posture is a defensive choice rather than a permanent character
  // property. Cautious or suppressed defenders duck behind real cover;
  // advancing or unsuppressed engaging enemies stand back up to fire.
  const threat=visible[0]?.p??a.heard??a.contact??a.watch;
  if(threat&&a.velocity<15&&nearCover(a.p,threat)&&
    (a.suppression>.26||a.personality==='cautious'||a.alert==='cover'))
    a.posture='crouch';
  else if(a.velocity>20||a.suppression<.12||a.alert==='engaging')
    a.posture='stand';
  // Crouching behind chest-high furniture can make a visible contact
  // impossible to shoot. Stand up when that alone restores the muzzle lane.
  if(a.posture==='crouch'&&visible.length){
    const b=visible[0],height=aimHeight(b.posture==='crouch');
    const low=assessFireLane(a.p,18,b.p,height,COVER,WALLS,s.doors);
    const high=assessFireLane(a.p,26,b.p,height,COVER,WALLS,s.doors);
    if(low.blocker==='cover'&&high.blocker==='clear')a.posture='stand';
  }
  // Evaluate each event once rather than running expensive portal rays
  // sixty times a second for an unheard sound.
  const sound=[...s.noise].reverse().find(n=>
    n.time>a.lastNoiseExaminedAt&&s.seconds-n.time<1);
  if(sound)a.lastNoiseExaminedAt=sound.time;
  const intensity=sound?heardIntensity(sound.p,a.p,sound.radius,
    s.doors,WALLS):0;
  const newest=intensity>0?sound:null;
  if(newest&&!visible.length&&a.alert!=='retreat'){
    a.lastNoiseAt=newest.time;
    const travel=acousticDistance(newest.p,a.p,s.doors,WALLS);
    const spread=newest.kind==='gunshot'?
      Math.max(25,travel*.16):Math.max(13,travel*.13);
    const heard={x:newest.p.x+(random(s)-.5)*spread,
      y:newest.p.y+(random(s)-.5)*spread};
    a.heard=heard;a.contact=heard;a.watch=clone(heard);
    a.defense=null;
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
  if(!a.contacted&&!a.contact&&a.alert==='idle'&&a.watch){
    if(a.defense===null&&s.seconds>=a.defenseUntil){
      a.defense=defensivePosition(a,a.watch,s);
      a.defenseUntil=s.seconds+2;
    }
    if(a.defense&&d(a.p,a.defense)>11){
      if(!a.nav.length)a.nav=route(a.p,a.defense);
      if(!a.nav.length){
        a.defense=null;a.defenseUntil=s.seconds+.7;
      }else{
        approach(a,a.defense,dt,s,.62);
        if(a.nav.length)rotate(a,angle(a.p,a.nav[0]),dt);
        return;
      }
    }
    rotate(a,angle(a.p,a.watch),dt);
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
      if(!a.nav.length){
        const goal=reachableInvestigation(a.p,a.contact);
        if(goal)a.nav=route(a.p,goal);
        else{a.alert='cover';a.contact=null;a.defense=null;}
      }
      if(a.nav.length&&a.contact)approach(a,a.nav.at(-1)??a.contact,dt,s,
        a.personality==='aggressor'?1.1:.82);
    }
    if(a.alert==='investigating'&&a.contact&&d(a.p,a.contact)<35){
      a.alert='cover';a.contact=null;a.nav=[];
      a.defense=defensivePosition(a,a.heard??a.p,s);
      a.defenseUntil=s.seconds+6;
    }
  }
  if(a.alert==='cover'&&a.defense&&d(a.p,a.defense)>10){
    if(!a.nav.length)a.nav=route(a.p,a.defense);
    if(a.nav.length)approach(a,a.defense,dt,s,.7);
    else{a.defense=null;a.defenseUntil=s.seconds+.8;}
  }
  if(!a.contact&&a.watch)rotate(a,angle(a.p,a.watch),dt);
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
function strikeSurface(from:Pt,aimed:Pt,s:Session,
  fromZ=22,toZ=22):{
  end:Pt;surface:ShotEvent['surface']}{
  let best=1,material:ShotEvent['surface']='dust';
  for(const wall of WALLS){
    const t=segmentImpact(from,aimed,wall);
    if(t!==null&&t<best){best=t;material='stone';}
  }
  for(const door of s.doors){
    const t=segmentImpact(from,aimed,doorLeafSegment(door));
    if(t!==null&&t<best){best=t;material='wood';}
  }
  for(const box of COVER){
    const u=coverImpactFraction(from,aimed,fromZ,toZ,box);
    if(u!==null&&u<best){best=u;material=box.low?'wood':'metal';}
  }
  return {end:{x:from.x+(aimed.x-from.x)*best,
    y:from.y+(aimed.y-from.y)*best},surface:material};
}
/** Suppression is an authored area instruction: deliberate misses consume
 * real ammunition and can unsettle defenders, but never inflict an
 * omniscient hit on an unseen actor. */
function fireSuppression(s:Session,a:TeamActor,dt:number){
  const point=a.suppressPoint;
  if(!point||a.fireCd>0)return;
  a.weaponYaw=approachAngle(a.weaponYaw,angle(a.p,point),dt*4.5);
  a.aim=Math.min(1,a.aim+dt*1.3);
  if(a.aim<.65||Math.abs(angleDifference(a.weaponYaw,
    angle(a.p,point)))>.18)return;
  if(Math.abs(angleDifference(a.heading,a.weaponYaw))>.87){
    rotate(a,a.weaponYaw,dt);return;
  }
  const spread=dispersion(a.weapon,'ads',a.stability,a.velocity>10,
    a.suppression,a.injuryStage,a.recoil)*.9;
  const proposedYaw=shotYaw(a.weaponYaw,spread,random(s),random(s));
  const muzzle=muzzleAtShot({x:a.p.x,z:a.p.y,
    heading:a.heading,weaponYaw:proposedYaw,weapon:a.weapon,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil});
  const yaw=muzzle.yaw;
  const from={x:muzzle.x,y:muzzle.z};
  const far=muzzleEndpoint(from,yaw,Math.max(40,d(from,point)));
  const friends=team(s).filter(o=>o!==a&&o.health>0).map(o=>o.p);
  if(assessFireLane(from,muzzle.y,far,14,COVER,WALLS,s.doors,
    friends).blocker==='friendly')return;
  const impact=strikeSurface(from,far,s,muzzle.y,14);
  a.fireCd=WEAPONS[a.weapon].interval*1.6;
  a.magazine--;a.shots++;a.lastShotAt=s.seconds;
  a.recoil=Math.min(.9,a.recoil+BALLISTICS[a.weapon].recoilKick);
  a.stability=Math.max(0,a.stability-.13);
  const shotId=s.nextShotId++;
  const height=impact.surface==='dust'?1:14;
  s.shots.push({id:shotId,shooterId:a.id,targetId:null,
    start:from,end:impact.end,age:0,hit:false,side:a.side,
    shotYaw:yaw,mode:'ads',spread,muzzleHeight:muzzle.y,
    impactHeight:height,firedAt:s.seconds,
    healthBefore:0,healthAfter:0,down:false,surface:impact.surface});
  s.impactMarks.push({id:s.nextEffectId++,p:clone(impact.end),
    surface:impact.surface,height,age:0});
  if(s.impactMarks.length>92)s.impactMarks.shift();
  s.casings.push({id:shotId,at:s.seconds,weapon:a.weapon,side:a.side,
    x:muzzle.x-4*Math.cos(yaw),z:muzzle.z-4*Math.sin(yaw),
    y:muzzle.y-3,heading:yaw});
  if(s.casings.length>CASING_LIMIT)s.casings.shift();
  s.sparks.push({p:clone(a.p),side:a.side,age:0});
  hear(s,a.p,WEAPONS[a.weapon].noise,'gunshot');
  battleEvent(s,'shot',a,a.p,a.name+' SUPPRESSING AREA');
  for(const e of enemies(s)){
    if(e.health<=0||d(e.p,impact.end)>50)continue;
    if(WALLS.some(w=>segmentsCross({a:impact.end,b:e.p},w)))continue;
    e.suppression=Math.min(1,e.suppression+.16);
    e.morale=Math.max(0,e.morale-.025);
  }
}
function fire(s:Session,a:TeamActor,dt:number){
  if(a.health<=0){
    a.reload=0;a.reloadMode=null;return;
  }
  // Sprinting is a traversal decision, not free accurate fire on the move.
  if((a.pace==='run'||a.plan[0]?.moveMode==='sprint')&&a.velocity>12){
    a.aim=Math.max(0,a.aim-dt*2.2);
    a.weaponYaw=approachAngle(a.weaponYaw,a.heading,dt*4);
    return;
  }
  const profile=BALLISTICS[a.weapon];
  const recovering=recoverWeapon(a.recoil,a.stability,dt,profile,a.velocity>10);
  a.recoil=recovering.recoil;a.stability=recovering.stability;
  // An abrupt turn disturbs the actual weapon state, even if movement
  // speed is zero. It takes time to settle the sights again.
  if(a.turning>.12)a.stability=Math.max(0,a.stability-
    dt*Math.min(1.6,a.turning*.30));
  if(a.reload>0){
    advanceReload(s,a,dt);return;
  }
  if(!a.magazine){beginReload(s,a);return;}
  if(a.flashUntil>s.seconds){a.aim=0;return;}
  if(a.side==='blue'){
    if(a.firePolicy==='hold'){
      a.aim=Math.max(0,a.aim-dt*.35);return;
    }
    if(a.firePolicy==='return'&&a.suppression<.10&&
      s.seconds-a.lastHitAt>3){
      a.aim=Math.max(0,a.aim-dt*.35);return;
    }
    if(a.firePolicy==='suppress'){
      fireSuppression(s,a,dt);return;
    }
  }
  const enemiesOf=a.side==='blue'?enemies(s):team(s);
  const visible=enemiesOf.filter(e=>inSight(a,e,s));
  const target=a.side==='blue'&&a.firePolicy==='focus'?
    visible.find(e=>e.id===a.focusTargetId):
    visible.sort((x,y)=>d(a.p,x.p)-d(a.p,y.p))[0];
  if(!target){
    a.targetId=null;a.aim=Math.max(0,a.aim-dt*.6);
    a.weaponYaw=approachAngle(a.weaponYaw,a.heading,dt*profile.turnSpeed);
    return;
  }
  if(a.targetId!==target.id){a.targetId=target.id;a.aim=0;
    a.stability=Math.min(a.stability,.65);}
  const moving=a.velocity>10;
  const weapon=WEAPONS[a.weapon];
  const acquisition=(moving?weapon.acquisition*1.8:weapon.acquisition)*
    (2-skillMultiplier(a.skills.handling,.4))*
    (a.side==='red'?1.65:1)+
    (a.personality==='cautious'?.12:0);
  a.aim=Math.min(1,a.aim+dt/acquisition);
  const range=d(a.p,target.p);
  const desiredYaw=angle(a.p,target.p);
  a.weaponYaw=approachAngle(a.weaponYaw,desiredYaw,dt*profile.turnSpeed*
    (a.suppression>.6?.75:1));
  const mode=readyMode(range,a.aim,a.weapon);
  if(!mode||a.fireCd>0)return;
  if(Math.abs(angleDifference(a.heading,a.weaponYaw))>.87){
    rotate(a,a.weaponYaw,dt);return;
  }
  // Do not claim a sighted hit while the barrel is still turning past target.
  if(Math.abs(Math.atan2(Math.sin(desiredYaw-a.weaponYaw),
    Math.cos(desiredYaw-a.weaponYaw)))>.38)return;
  a.fireMode=mode;
  // The eyes may have a contact even when the muzzle cannot safely fire.
  // Hold the shot rather than dumping ammunition into adjacent cover or
  // risking a friendly operator standing in the near firing corridor.
  const sightMuzzle=muzzleAtShot({x:a.p.x,z:a.p.y,heading:a.heading,
    weaponYaw:a.weaponYaw,weapon:a.weapon,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil,threatRange:range});
  const friends=s.operators.filter(o=>o!==a&&o.health>0&&
    o.side===a.side).map(o=>o.p);
  const lane=assessFireLane({x:sightMuzzle.x,y:sightMuzzle.z},
    sightMuzzle.y,target.p,aimHeight(target.posture==='crouch'),
    COVER,WALLS,s.doors,friends);
  a.lastFireBlock=lane.blocker;
  if(lane.blocker!=='clear'){
    if(a.side==='blue'&&s.seconds-a.lastLaneWarnAt>2){
      notify(s,a.name+' FIRE BLOCKED · '+lane.blocker.toUpperCase());
      a.lastLaneWarnAt=s.seconds;
    }
    return;
  }
  const priorBurst=s.seconds-a.lastShotAt<.48;
  const proposedBurst=priorBurst?a.burstCount+1:1;
  const cone=(dispersion(a.weapon,mode,a.stability,moving,
    a.suppression,a.injuryStage,a.recoil)+
    handlingInstability(a.turning,a.velocity,a.recoil,a.stability))*
    (2-skillMultiplier(mode==='point'?a.skills.pointShooting:
      range>weapon.optimalRange?a.skills.longRange:a.skills.precision,.28));
  // Shot direction is the firearm's physical yaw at ignition. Sampling
  // happens *before* muzzle construction, not as an invisible post-shot roll.
  const proposedYaw=shotYaw(a.weaponYaw,cone,random(s),random(s));
  const muzzle=muzzleAtShot({x:a.p.x,z:a.p.y,heading:a.heading,
    weaponYaw:proposedYaw,weapon:a.weapon,aim:a.aim,posture:a.posture,
    velocity:a.velocity,recoil:a.recoil,threatRange:range});
  const yaw=muzzle.yaw; // never fire a separate invisible direction
  const muzzlePoint={x:muzzle.x,y:muzzle.z};
  // Spread may put another teammate in the actual bullet corridor.
  const shotTarget=muzzleEndpoint(muzzlePoint,yaw,
    Math.max(1,d(muzzlePoint,target.p)));
  const shotLane=assessFireLane(muzzlePoint,muzzle.y,
    shotTarget,aimHeight(target.posture==='crouch'),
    COVER,WALLS,s.doors,friends);
  if(shotLane.blocker==='friendly')return;
  const muzzleReach=strikeSurface(a.p,muzzlePoint,s,
    muzzle.y,muzzle.y);
  if(d(a.p,muzzleReach.end)+.7<d(a.p,muzzlePoint)){
    a.aim=Math.min(a.aim,.82);return;
  }
  a.weaponYaw=yaw; // renderer sees exactly the outgoing shot orientation
  a.fireCd=weapon.interval*(a.side==='red'?1.30:1);
  a.magazine--;a.shots++;a.burstCount=proposedBurst;
  a.lastShotAt=s.seconds;
  const hitRadius=Math.max(4.2,10.5-
    (target.posture==='crouch'?1.7:0)-
    (nearCover(target.p,a.p)?2:0));
  const candidateHit=rayHitsActor(muzzlePoint,yaw,target.p,hitRadius);
  const muzzleRange=d(muzzlePoint,target.p);
  const far=muzzleEndpoint(muzzlePoint,yaw,Math.max(muzzleRange+38,170));
  // Aim for the target's visible upper body, not an imaginary ground-level
  // hitpoint. At close range this clears waist-high cover naturally.
  const strikeHeight=muzzle.y+(aimHeight(target.posture==='crouch')-
    muzzle.y)*d(muzzlePoint,far)/Math.max(1,muzzleRange);
  const strike=strikeSurface(muzzlePoint,far,s,muzzle.y,strikeHeight);
  // Obstruction before the target defeats a perfectly aligned barrel.
  const blockerDist=d(muzzlePoint,strike.end);
  const hit=candidateHit&&blockerDist>=muzzleRange-hitRadius;
  const end=hit?clone(target.p):strike.end;
  const impact=hit?{end,surface:'blood' as const}:strike;
  a.recoil=Math.min(.9,a.recoil+profile.recoilKick*
    (a.burstCount>2?1.20:1)*
    (2-skillMultiplier(a.skills.recoilControl,.42)));
  a.stability=Math.max(0,a.stability-
    (mode==='point'?.23:.16)*
    (2-skillMultiplier(a.skills.composure,.38))-a.recoil*.10);
  const healthBefore=target.health;
  const severity=hit&&s.site?woundSeverity(weapon,range,
    nearCover(target.p,a.p),random(s)):1;
  const nextStage=Math.min(3,target.injuryStage+(hit?severity:0));
  const healthAfter=hit?
    (s.site?nextStage>=3?0:4-nextStage:Math.max(0,healthBefore-1)):
    healthBefore;
  s.sparks.push({p:clone(a.p),side:a.side,age:0});
  // Immutable shot identity lets 2D/3D attach recoil and damage effects to
  // the correct actors without guessing from proximity or team color.
  const impactHeight=hit?aimHeight(target.posture==='crouch'):
    impact.surface==='dust'?1:14;
  s.impactMarks.push({id:s.nextEffectId++,p:clone(end),
    surface:impact.surface,height:impactHeight,age:0});
  if(s.impactMarks.length>92)s.impactMarks.shift();
  const shotId=s.nextShotId++;
  const region=hitRegion(shotId);
  const nearSolid=COVER.some(c=>!c.low&&
    Math.abs(target.p.x-c.x)<=c.w/2+12&&
    Math.abs(target.p.y-c.y)<=c.h/2+12);
  const nearWall=WALLS.some(w=>{
    const vx=w.b.x-w.a.x,vy=w.b.y-w.a.y;
    const denominator=Math.max(1e-6,vx*vx+vy*vy);
    const t=clamp(((target.p.x-w.a.x)*vx+
      (target.p.y-w.a.y)*vy)/denominator,0,1);
    return d(target.p,{x:w.a.x+vx*t,y:w.a.y+vy*t})<12;
  });
  const fall=chooseFall(target.heading,yaw,nearSolid||nearWall);
  s.shots.push({
    id:shotId,shooterId:a.id,targetId:target.id,
    start:muzzlePoint,end,age:0,hit,side:a.side,
    shotYaw:yaw,mode,spread:cone,
    muzzleHeight:muzzle.y,firedAt:s.seconds,impactHeight,
    hitRegion:hit?region:undefined,downPose:hit&&healthAfter<=0?
      fall:undefined,
    healthBefore,healthAfter,down:hit&&healthAfter<=0,
    surface:impact.surface,
  });
  s.casings.push({id:shotId,at:s.seconds,weapon:a.weapon,side:a.side,
    x:muzzle.x-4*Math.cos(a.weaponYaw),z:muzzle.z-4*Math.sin(a.weaponYaw),
    y:muzzle.y-3,heading:a.weaponYaw});
  if(s.casings.length>CASING_LIMIT)s.casings.shift();
  hear(s,a.p,weapon.noise,'gunshot');
  battleEvent(s,'shot',a,a.p,a.name+' FIRED '+weapon.label);
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
  if(target.side==='red')target.morale=Math.max(0,target.morale-.035);
  if(hit){
    target.health=healthAfter;
    target.injuryStage=s.site?nextStage:Math.min(3,target.injuryStage+1);
    target.lastHitAt=s.seconds;
    // Incoming fire physically interrupts aim and the current weapon.
    target.stability=Math.max(0,target.stability-.22*severity);
    target.recoil=Math.min(.9,target.recoil+.07*severity);
    target.weaponYaw+=Math.sin(yaw-target.heading)*.045*severity;
    target.lastHitRegion=region;target.lastHitYaw=yaw;
    target.lastHitSeverity=severity;
    if(target.side==='red')target.morale=Math.max(0,
      target.morale-.18*severity);
    battleEvent(s,healthAfter<=0?'down':'wound',target,target.p,
      target.name+' '+injuryOf(target.injuryStage).toUpperCase());
    a.hits++;
    if(target.health<=0){
      a.kills++;s.deaths++;target.lastDownAt=s.seconds;
      target.downPose=fall;
      target.plan=[];target.path=[];
      target.nav=[];target.velocity=0;
      notify(s,target.name+' DOWN');
      for(const ally of enemies(s))if(ally!==target&&ally.health>0&&
        d(ally.p,target.p)<145)ally.morale=Math.max(0,ally.morale-.13);
    }else notify(s,target.name+' '+injuryOf(target.injuryStage).toUpperCase());
  }
}
function mission(s:Session,dt:number){
  if(s.rescue){
    if(s.rescue.following){
      const escort=team(s).find(a=>a.id===s.rescue!.following&&a.health>0);
      if(escort){
        s.rescue.p={x:escort.p.x+Math.cos(escort.heading+Math.PI)*15,
          y:escort.p.y+Math.sin(escort.heading+Math.PI)*15};
      }else s.rescue.following=null;
    }
    if(s.mission==='extract'&&!s.rescue.following){
      const rescuer=team(s).find(a=>a.health>0&&near(a.p,s.rescue!.p,27));
      if(rescuer){
        s.rescue.following=rescuer.id;
        notify(s,'PERSON JOINED '+rescuer.name);
      }
    }
  }
  if(team(s).every(a=>a.health<=0)){
    s.phase='lost';s.report=['OPERATION FAILED','ALL OPERATORS LOST'];return;
  }
  const captured=s.missionType==='capture'&&s.captureTarget?
    enemies(s).some(a=>a.id===s.captureTarget&&a.health<=0):false;
  if(s.mission==='clear'&&
    (captured||(s.missionType!=='capture'&&enemies(s).every(a=>a.health<=0)))){
    s.mission='secure';
    if(captured){
      const target=enemies(s).find(a=>a.id===s.captureTarget);
      if(target)s.scenario.objective=clone(target.p);
    }
    notify(s,s.missionType==='capture'?'TARGET NEUTRALIZED — SECURE':
      'CLEAR — SECURE OBJECTIVE');
    battleEvent(s,'objective',null,s.scenario.objective,'HOSTILES SECURED');
  }
  const objectiveReached=team(s).some(a=>a.health>0&&
    near(a.p,s.scenario.objective,36));
  if(s.mission==='secure'&&objectiveReached){
    if(s.missionType==='hold'){
      // A contested position is not secured merely by standing on its
      // marker. Nearby active defenders arrest the actual hold clock.
      const contested=enemies(s).some(e=>e.health>0&&
        near(e.p,s.scenario.objective,74));
      if(contested){
        s.holdTime=Math.max(0,s.holdTime-dt*.6);
        return;
      }
      s.holdTime+=dt;
      if(s.holdTime<7)return;
    }
    if(s.missionType==='intel'){
      // Retrieving physical documents is a deliberate interaction,
      // interruptible by leaving the cache, not an instantaneous tap.
      s.holdTime+=dt;
      if(s.holdTime<1.2)return;
    }
    if(s.missionType==='capture'){
      const target=enemies(s).find(e=>e.id===s.captureTarget);
      if(!target||target.health>0)return;
      s.captureSecured=true;
    }
    s.mission='extract';
    if(s.rescue){
      const escort=team(s).filter(a=>a.health>0).sort((a,b)=>
        d(a.p,s.rescue!.p)-d(b.p,s.rescue!.p))[0];
      s.rescue.following=escort?.id??null;
    }
    const verb=s.missionType==='rescue'?'PERSON FOUND':
      s.missionType==='hold'?'POSITION HELD':
      s.missionType==='intel'?'DOCUMENTS RECOVERED':
      s.missionType==='capture'?'TARGET SECURED':'OBJECTIVE SECURED';
    notify(s,verb+' — EXTRACT');
    battleEvent(s,'objective',null,s.scenario.objective,verb);
  }else if((s.missionType==='hold'||s.missionType==='intel')&&
    s.mission==='secure'){
    s.holdTime=Math.max(0,s.holdTime-dt*.6);
  }
  if(s.mission==='extract'&&team(s).some(a=>a.health>0&&
    near(a.p,s.scenario.extract,37)&&
    (!s.rescue||near(s.rescue.p,s.scenario.extract,45)))){
    s.mission='done';s.phase='won';
    s.report=['OPERATION COMPLETE',s.missionType.toUpperCase(),
      'EXTRACTION COMPLETE'];
    notify(s,'MISSION COMPLETE');
    battleEvent(s,'objective',null,s.scenario.extract,'MISSION COMPLETE');
  }
}
function stepFlashbangs(s:Session,h:number){
  const active:FlashGrenade[]=[];
  for(const g of s.grenades){
    g.age+=h;
    const t=Math.min(1,g.age/.55);
    const arc=4*t*(1-t);
    g.p=g.path?sampleThrow(g.path,t).p:{
      x:g.from.x+(g.to.x-g.from.x)*t,
      y:g.from.y+(g.to.y-g.from.y)*t};
    void arc; // The renderer supplies the vertical ballistic arc.
    if(g.age<g.fuse){active.push(g);continue;}
    s.flashBursts.push({id:g.id,p:clone(g.to),age:0});
    battleEvent(s,'flash',null,g.to,'FLASH DETONATED');
    hear(s,g.to,420,'flashbang');
    for(const a of s.operators){
      if(a.health<=0)continue;
      const dist=d(a.p,g.to);
      if(dist>105)continue;
      const ray={a:g.to,b:a.p};
      const blocked=WALLS.some(w=>segmentsCross(ray,w))||
        doorBlocksRay(s.doors,ray);
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
/** Automatic close-contact separation when two opposing actors reach
 * point-blank range. This does not author a new order or grant a free kill.
 * A short bash interrupts the opponent's firearm and tries legal knockback. */
function resolveCloseContact(s:Session){
  for(let i=0;i<s.operators.length;i++){
    const a=s.operators[i];
    if(a.health<=0||a.surrendered||s.seconds-a.lastBashAt<2.2)continue;
    for(let j=0;j<s.operators.length;j++){
      const b=s.operators[j];
      if(b===a||b.side===a.side||b.health<=0||b.surrendered||
        s.seconds-b.lastBashAt<.9)continue;
      const gap=d(a.p,b.p);
      if(gap>=17||gap<.01)continue;
      const toward=angle(a.p,b.p);
      if(gap>10&&Math.abs(angleDifference(a.heading,toward))>1.45)
        continue;
      const ux=(b.p.x-a.p.x)/gap,uy=(b.p.y-a.p.y)/gap;
      for(const shift of [16,10,5]){
        const pushed={x:b.p.x+ux*shift,y:b.p.y+uy*shift};
        if(!sweptBodyClear(b.p,pushed,s.doors))continue;
        if(s.operators.some(o=>o!==a&&o!==b&&o.health>0&&
          d(o.p,pushed)<11))continue;
        b.priorP=clone(b.p);b.p=pushed;break;
      }
      a.lastBashAt=s.seconds;a.lastBashRole='push';
      b.lastBashAt=s.seconds;b.lastBashRole='receive';
      b.fireCd=Math.max(b.fireCd,.62);b.aim=Math.max(0,b.aim-.65);
      b.stability=Math.max(0,b.stability-.3);
      b.suppression=Math.min(1,b.suppression+.6);
      b.velocity=0;b.nav=[];
      a.velocity=0;a.recoil=Math.min(.9,a.recoil+.12);
      notify(s,a.name+' PUSHED '+b.name);
      break;
    }
  }
}
export function stepSession(s:Session,dt:number){
  if(s.phase!=='running')return;
  const h=clamp(dt,0,1/30);
  s.seconds+=h;
  for(const door of s.doors){
    if(door.heldBy){
      const holder=s.operators.find(a=>a.id===door.heldBy);
      if(!holder||holder.health<=0||holder.plan.length>0||
         holder.nav.length>0||!doorReachable(holder.p,door))
        door.heldBy=null;
    }
    advanceDoor(door,h,s.operators.filter(a=>a.health>0).map(a=>a.p));
  }
  s.sparks=s.sparks.filter(a=>(a.age+=h)<.20);
  s.shots=s.shots.filter(a=>(a.age+=h)<.40);
  s.noise=s.noise.filter(n=>s.seconds-n.time<4);
  for(const magazine of s.dropped)magazine.age+=h;
  s.impactMarks=s.impactMarks.filter(mark=>(mark.age+=h)<24);
  s.flashBursts=s.flashBursts.filter(b=>(b.age+=h)<.70);
  stepFlashbangs(s,h);
  for(const a of s.operators){
    if(a.health<=0&&a.reload>0){a.reload=0;a.reloadMode=null;}
    a.fireCd=Math.max(0,a.fireCd-h);
    if(a.side==='red'&&a.health>0){
      a.morale=Math.min(1,a.morale+h*.006-
        (a.suppression>.65?h*.075:0));
      if(a.morale<.12&&a.suppression>.55){
        a.surrendered=true;a.health=0;a.injuryStage=3;
        a.lastDownAt=s.seconds;a.downPose='slump';
        a.velocity=0;a.nav=[];a.plan=[];
        a.reload=0;a.reloadMode=null;
        notify(s,a.name+' SURRENDERED');
        battleEvent(s,'surrender',a,a.p,a.name+' SURRENDERED');
      }
    }
    a.suppression=Math.max(0,a.suppression-h*.17);
    a.priorP=clone(a.p);
    if(a.health<=0)continue;
    if(a.side==='blue')runOrders(s,a,h);
    else enemyDecisions(s,a,h);
  }
  for(const a of s.operators)a.stride+=d(a.p,a.priorP);
  resolveCloseContact(s);
  observe(s);
  for(const a of s.operators)fire(s,a,h);
  mission(s,h);
}
export function operationBriefing(s:Session){
  const brief=operationBrief(s.missionType);
  return { ...brief,
    building:s.site?.archetype?.toUpperCase()??'UNSPECIFIED SITE',
    layout:s.intel.mode==='floor-plan'&&s.site?
      s.site.roomCount+' DOCUMENTED ROOMS':'INTERIOR NOT FULLY CHARTED',
    squad:team(s).length,
  };
}
export function missionText(s:Session){
  if(s.phase==='won')return 'COMPLETE — OPERATION SUCCESS';
  if(s.phase==='lost')return 'MISSION FAILED';
  if(s.mission==='clear')return s.missionType==='capture'?
    'INCAPACITATE OR FORCE SURRENDER OF TARGET':
    'CLEAR HOSTILES • SECURE OBJECTIVE';
  if(s.mission==='secure')return s.missionType==='hold'?
    'HOLD OBJECTIVE • '+Math.floor(s.holdTime)+'/7 SECONDS':
    s.missionType==='rescue'?'REACH PERSON IN TARGET ROOM':
    s.missionType==='intel'?'RECOVER INTELLIGENCE • '+
      s.holdTime.toFixed(1)+'/1.2s':
    s.missionType==='capture'?'SECURE NEUTRALIZED TARGET':
    'SECURE OBJECTIVE';
  return 'RETURN TO EXTRACTION OUTSIDE';
}
export function debrief(s:Session){
  const own=team(s);
  const casualties=own.filter(a=>a.health<=0).length;
  const shots=own.reduce((t,a)=>t+a.shots,0);
  const hits=own.reduce((t,a)=>t+a.hits,0);
  const target=enemies(s).find(e=>e.id===s.captureTarget);
  const assessment=assessOperation({
    outcome:s.phase==='won'?'success':'failure',
    kind:s.missionType as OperationKind,
    elapsed:Math.floor(s.seconds),casualties,teamSize:own.length,
    shots,hits,objective:s.mission==='done',
    targetSurrendered:target?.surrendered??false,
    extracted:own.filter(a=>a.health>0&&
      near(a.p,s.scenario.extract,47)).length,
  });
  return {result:s.phase,time:Math.floor(s.seconds),casualties,
    shots,hits,
    kills:own.reduce((t,a)=>t+a.kills,0),
    pauses:s.timesPaused,variant:s.scenario.name,
    objective:s.mission==='done',
    type:s.missionType,
    grade:assessment.grade,score:assessment.score,
    accuracy:assessment.accuracy,survived:assessment.survived,
    squad:own.map(a=>({id:a.id,name:a.name,
      survived:a.health>0,injury:a.injuryStage,
      fired:a.shots,hits:a.hits})),
    captureSecured:s.captureSecured,
    rescueExtracted:!!s.rescue&&s.phase==='won'};
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
