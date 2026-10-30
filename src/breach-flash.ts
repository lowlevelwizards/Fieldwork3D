/** Build 097: authored grenade trajectory and open-door corner routes. */
import {doorBlocksRay,WALLS,segmentsCross,doorCenter,type Pt,type Door} from './breach-core.ts';
export type ThrowPath={points:Pt[];mode:'direct'|'doorway'|'bank';valid:boolean;
  reason?:string;via?:Pt};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const blocked=(from:Pt,to:Pt,doors:Door[])=>{
  const seg={a:from,b:to};
  return WALLS.some(w=>segmentsCross(seg,w))||
    doorBlocksRay(doors,seg);
};
export function validateThrow(from:Pt,to:Pt,doors:Door[],
  plannedOpen:string[]=[]):ThrowPath{
  const range=dist(from,to);
  if(range<16||range>210)return {points:[from,to],mode:'direct',
    valid:false,reason:'OUT OF THROW RANGE'};
  const available=doors.map(door=>({...door,
    open:door.open||plannedOpen.includes(door.id),
    // Preview the leaf at its eventual authored angle rather than its
    // current closed collision position.
    openFraction:plannedOpen.includes(door.id)?1:door.openFraction}));
  if(!blocked(from,to,available))
    return {points:[from,to],mode:'direct',valid:true};
  // Deliberate doorway throw: a grenade can be banked through a nearby
  // opening while the soldier stays on the safe side of its doorframe.
  for(const door of available)if(door.open){
    const center=doorCenter(door);
    const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
    const length=Math.max(1,Math.hypot(dx,dy));
    for(const offset of [0,-8,8,-14,14]){
      const via={x:center.x+dx/length*offset,
        y:center.y+dy/length*offset};
      if(dist(from,via)>125||dist(to,via)>155)continue;
      if(blocked(from,via,available)||blocked(via,to,available))continue;
      const pathLength=dist(from,via)+dist(via,to);
      if(pathLength>250)continue;
      return {points:[from,via,to],via,mode:'doorway',valid:true};
    }
  }
  return {points:[from,to],mode:'direct',valid:false,
    reason:'WALL OR CLOSED DOOR BLOCKS THROW'};
}
export function sampleThrow(path:ThrowPath,t:number):{p:Pt;height:number}{
  const alpha=Math.max(0,Math.min(1,t));
  const segments=path.points.slice(1).map((point,i)=>
    dist(path.points[i],point));
  const total=segments.reduce((a,b)=>a+b,0)||1;
  let along=alpha*total;
  for(let i=0;i<segments.length;i++){
    if(along<=segments[i]||i===segments.length-1){
      const f=Math.min(1,along/Math.max(.01,segments[i]));
      const a=path.points[i],b=path.points[i+1];
      return {p:{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f},
        height:2+28*4*alpha*(1-alpha)};
    }
    along-=segments[i];
  }
  return {p:path.points.at(-1)!,height:2};
}
