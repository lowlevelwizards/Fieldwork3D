import type {SessionWorldGeometry} from './breach-world-context.ts';
/** Build 098: room defense positions, spacing and threat-oriented watches. */
import {COVER,WALLS,activeSite,passable,route,doorCenter,type Door,type Pt} from './breach-core.ts';
import {assessFireLane} from './breach-fire-safety.ts';
import {safetyBodyFor} from './breach-friendly-safety-volume.ts';
import {directionalCoverFrom} from './breach-cover-direction.ts';
import {coverScore} from './breach-defense-scoring.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {aiSiteIndex,buildAiSiteIndex} from './breach-ai-site-index.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type Defender={id:string;p:Pt;health:number;defense:Pt|null;
 posture?:'stand'|'crouch'};
export function defenseCandidates(origin:Pt,threat:Pt,doors:Door[],world?:SessionWorldGeometry):Pt[]{
  void threat;
  const options:Pt[]=[];
  const candidates=new Set<string>();
  const consider=(p:Pt,max=220)=>{
    const key=Math.round(p.x)+','+Math.round(p.y);
    if(candidates.has(key)||dist(origin,p)>max||!(world?world.passable(p):passable(p)))return;
    // Defense is an immediate local maneuver, not a full-building mission.
    // A full A* route for EVERY corner/cover candidate caused >5 second
    // pauses when all defenders chose their first position on unpause.
    // Require a valid swept physical corridor instead. Pursuit/search still
    // use authoritative routed navigation when moving across rooms.
    if(!sweptBodyClear(origin,p,doors,8,world))return;
    candidates.add(key);options.push(p);
  };
  const index=world?aiSiteIndex(world,doors):buildAiSiteIndex(activeSite()??null,COVER,doors);
  for(const anchor of index.anchors)consider({...anchor.p},anchor.radius);
  if(world?world.passable(origin):passable(origin))consider(origin);
  return options;
}
export type DefenseOptions={requireFiringLane?:boolean;targetHeight?:number};
export function chooseDefense(origin:Pt,threat:Pt,doors:Door[],
  others:Defender[],selfId:string,policy:DefenseOptions={},
 world?:SessionWorldGeometry):Pt|null{
  const options=defenseCandidates(origin,threat,doors,world);
  let best:Pt|null=null,score=-Infinity;
  // The roster and origin cover are unchanged during this pure selection.
  // Prepare once rather than allocating and rescanning per candidate.
  const peers=others.filter(a=>a.id!==selfId&&a.health>0);
  const bodies=peers.map(safetyBodyFor);
  const fixtures=world?.cover??COVER,walls=world?.walls??WALLS;
  const originProtected=directionalCoverFrom(threat,origin,fixtures).crouched;
  for(const p of options){
    const occupancy=peers.some(a=>dist(p,a.defense??a.p)<35);
    const protectedSpot=directionalCoverFrom(threat,p,fixtures).crouched;
    // Cover is only useful if the defender can still bring the muzzle
    // above or around it. Eye-level sight does not guarantee a firing lane.
    const lane=assessFireLane(p,26,threat,
      policy.targetHeight??32,fixtures,walls,doors,bodies);
    const firingValue=lane.blocker==='clear';
    // When actually repositioning to shoot a visible opponent, a point
    // with no real muzzle lane is not a valid destination, even if it
    // scores well as passive cover. Defensive holds still accept cover.
    if(policy.requireFiringLane&&!firingValue)continue;
    const span=peers.reduce((n,a)=>n+(dist(p,a.p)>55&&dist(p,a.p)<160?15:0),0);
    const doorHazard=doors.reduce((penalty,door)=>{
      const distance=dist(p,doorCenter(door));
      return penalty+(distance<24?45:distance<45?10:0);
    },0);
    // Choose watchable positions while favoring actual directional cover.
    const facing=dist(p,threat)>15?8:0;
    const value=coverScore({
      protected:protectedSpot,shotClear:firingValue,travel:dist(origin,p),
      range:dist(p,threat),allyConflict:occupancy,
      nearDoor:doorHazard>25,
      approachExposed:!originProtected&&
        dist(origin,p)>85
    })+span+facing;
    if(value>score){score=value;best=p;}
  }
  return best;
}
/** A defender relocating to fire must have a physically legal shot
 * from the selected position, otherwise retain the present stance and
 * retry after the existing cooldown instead of pacing between blind spots.
 */
export function chooseFiringDefense(origin:Pt,threat:Pt,doors:Door[],
 others:Defender[],selfId:string,targetHeight=32,
 world?:SessionWorldGeometry):Pt|null{
 return chooseDefense(origin,threat,doors,others,selfId,
  {requireFiringLane:true,targetHeight},world);
}
export function watchPoint(p:Pt,doors:Door[],world?:SessionWorldGeometry):Pt|null{
  const room=(world?world.site:activeSite())?.rooms.find(r=>
    p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
  const adjacent=room?doors.filter(door=>{
    const center=doorCenter(door);
    return center.x>=room.x-3&&center.x<=room.x+room.w+3&&
      center.y>=room.y-3&&center.y<=room.y+room.h+3;
  }):[];
  const choices=adjacent.length?adjacent:doors;
  const best=choices.slice().sort((a,b)=>
    dist(p,doorCenter(a))-dist(p,doorCenter(b)))[0];
  return best?doorCenter(best):null;
}
/** Search a few legal points around a noisy estimate, never omniscient
 * access to the hidden source. Avoid pursuing a location inside cover. */
export type InvestigationProbeResult=
  {kind:'pending';cursor:number}|{kind:'exhausted'}|
  {kind:'found';point:Pt;route:Pt[]};
/** Deterministic resumable candidate enumeration with a route-call budget. */
export function probeInvestigationRoute(origin:Pt,target:Pt,cursor:number,
  routeBudget:number,routeFor:(from:Pt,to:Pt)=>Pt[],
  canStand:(p:Pt)=>boolean):InvestigationProbeResult{
  let calls=0;
  for(let i=Math.max(0,Math.floor(cursor));i<25;i++){
    let point=target;
    if(i>0){
      const n=i-1,distance=[17,35,55][Math.floor(n/8)];
      const angle=(n%8)*Math.PI/4;
      point={x:target.x+Math.cos(angle)*distance,
        y:target.y+Math.sin(angle)*distance};
    }
    if(!canStand(point))continue;
    if(calls>=routeBudget)return {kind:'pending',cursor:i};
    calls++;
    const result=routeFor(origin,point);
    if(result.length)return {kind:'found',point:{...point},route:result};
  }
  return {kind:'exhausted'};
}
/** Compatibility for existing synchronous callers. */
export function reachableInvestigation(origin:Pt,target:Pt,
  routeFor:(from:Pt,to:Pt)=>Pt[]=route,
  canStand:(p:Pt)=>boolean=passable):Pt|null{
  const result=probeInvestigationRoute(origin,target,0,25,routeFor,canStand);
  return result.kind==='found'?result.point:null;
}
