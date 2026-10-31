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
/** Compact shoulder-side release offsets let a rear operator lob around
 * their teammate without demanding pixel-perfect doorframe placement. Every
 * release and doorway segment is still validated against solid geometry. */
export function validateThrow(from:Pt,to:Pt,doors:Door[],
  plannedOpen:string[]=[]):ThrowPath{
  const range=dist(from,to);
  if(range<12||range>215)return {points:[from,to],mode:'direct',
    valid:false,reason:'OUT OF THROW RANGE'};
  const available=doors.map(door=>({...door,
    open:door.open||plannedOpen.includes(door.id),
    openFraction:plannedOpen.includes(door.id)?1:door.openFraction}));
  const side={x:-(to.y-from.y)/Math.max(1,range),
    y:(to.x-from.x)/Math.max(1,range)};
  const forward={x:(to.x-from.x)/Math.max(1,range),
    y:(to.y-from.y)/Math.max(1,range)};
  const releases:Pt[]=[from];
  for(const lateral of [-5,5,-10,10,-15,15])
    for(const along of [0,5,-5]){
      const candidate={x:from.x+side.x*lateral+forward.x*along,
        y:from.y+side.y*lateral+forward.y*along};
      if(!blocked(from,candidate,available))releases.push(candidate);
    }
  for(const release of releases)
    if(!blocked(release,to,available))
      return {points:dist(from,release)<.01?[from,to]:
        [from,release,to],mode:'direct',valid:true};
  // Route through the free center of the actual opening, then try a
  // short inside-the-room hook to clear the near-side jamb or corner.
  let best:ThrowPath|null=null,score=Infinity;
  for(const door of available)if(door.open){
    const center=doorCenter(door);
    const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
    const length=Math.max(1,Math.hypot(dx,dy));
    const tangent={x:dx/length,y:dy/length};
    const normal={x:-tangent.y,y:tangent.x};
    const maxOffset=Math.max(0,length/2-7);
    for(const offset of [0,-5,5,-10,10,-15,15]){
      if(Math.abs(offset)>maxOffset)continue;
      const via={x:center.x+tangent.x*offset,
        y:center.y+tangent.y*offset};
      for(const release of releases){
        if(dist(release,via)>152||dist(to,via)>178||
          blocked(release,via,available))continue;
        const towards=(to.x-via.x)*normal.x+(to.y-via.y)*normal.y>=0?1:-1;
        const hooks:Pt[]=[via];
        for(const depth of [15,27,37])
          for(const sideways of [0,-9,9]){
            hooks.push({x:via.x+normal.x*depth*towards+
              tangent.x*sideways,
              y:via.y+normal.y*depth*towards+tangent.y*sideways});
          }
        for(const hook of hooks){
          if(blocked(via,hook,available)||blocked(hook,to,available))continue;
          const total=dist(from,release)+dist(release,via)+
            dist(via,hook)+dist(hook,to);
          if(total>282||total>=score)continue;
          score=total;
          const points=[from];
          if(dist(from,release)>.01)points.push(release);
          points.push(via);
          if(dist(via,hook)>.01)points.push(hook);
          points.push(to);
          best={points,via,mode:'doorway',valid:true};
        }
      }
    }
  }
  return best??{points:[from,to],mode:'direct',valid:false,
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
