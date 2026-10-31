/** Build 146: one deterministic description of movement failures.
 * Plan authoring keeps imperfect map intel; actual movement always checks
 * authoritative geometry and never fabricates a new tactical destination. */
import {W,H,WALLS,COVER,pointToSegment,passable,doorLeafSegment,route,
  type Pt,type Door,type Obstacle} from './breach-core.ts';
import {sweptBodyClear} from './breach-navigation.ts';
export type Blocker='bounds'|'wall'|'furniture'|'door'|'actor'|'route'|'clear';
export type MoveDiagnostic={blocker:Blocker;point:Pt;distance:number;
  id?:string};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const inBox=(p:Pt,b:Obstacle,r:number)=>
  Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.y-b.y)<b.h/2+r;
export function diagnoseMovement(from:Pt,to:Pt,doors:readonly Door[],
  actors:readonly Pt[]=[],radius=8):MoveDiagnostic{
  const samples=Math.max(1,Math.ceil(distance(from,to)/3.5));
  for(let i=1;i<=samples;i++){
    const f=i/samples,p={x:from.x+(to.x-from.x)*f,
      y:from.y+(to.y-from.y)*f};
    if(p.x<13||p.y<20||p.x>W-13||p.y>H-13)
      return {blocker:'bounds',point:p,distance:distance(from,p)};
    if(WALLS.some(w=>pointToSegment(p,w)<radius+1))
      return {blocker:'wall',point:p,distance:distance(from,p)};
    if(COVER.some(b=>inBox(p,b,radius)))
      return {blocker:'furniture',point:p,distance:distance(from,p)};
    const blocked=doors.find(d=>!d.open&&
      pointToSegment(p,doorLeafSegment(d))<radius+1);
    if(blocked)return {blocker:'door',point:p,
      distance:distance(from,p),id:blocked.id};
    if(actors.some(a=>distance(p,a)<radius*2))
      return {blocker:'actor',point:p,distance:distance(from,p)};
  }
  return {blocker:'clear',point:{...to},distance:distance(from,to)};
}
export function projectReachableGoal(from:Pt,to:Pt,{
  canStand=passable,
  routeTo=(a,b)=>route(a,b,canStand),
  tolerance=13,
}:{
  canStand?:(p:Pt)=>boolean;
  routeTo?:(a:Pt,b:Pt)=>Pt[];
  tolerance?:number;
}={}):{point:Pt;adjusted:boolean}|null{
  if(canStand(to)&&routeTo(from,to).length)
    return {point:{...to},adjusted:false};
  // Correct a thumb-tap only by a nearby physical offset. Never select
  // an unrelated room, a far-away position or a different side of a wall.
  const offsets:Pt[]=[];
  for(const r of [4,7,10,13]){
    if(r>tolerance)break;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      offsets.push({x:to.x+Math.cos(a)*r,y:to.y+Math.sin(a)*r});
    }
  }
  const possible=offsets.filter(p=>canStand(p)&&
    // The nudge cannot cross a solid physical wall/cover by accident.
    (passable(to,0)?diagnoseMovement(to,p,[],[],0).blocker==='clear':
      true));
  possible.sort((a,b)=>distance(a,to)-distance(b,to));
  for(const p of possible){
    if(routeTo(from,p).length)
      return {point:p,adjusted:true};
  }
  return null;
}
export function progressToward(from:Pt,to:Pt,goal:Pt){
  return distance(from,goal)-distance(to,goal);
}
export function routeSegmentsClear(from:Pt,points:readonly Pt[],doors:Door[]=[]){
  let previous=from;
  for(const next of points){
    if(!sweptBodyClear(previous,next,doors))return false;
    previous=next;
  }
  return true;
}
