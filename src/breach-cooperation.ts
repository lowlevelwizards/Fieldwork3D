/** Local micro-detours are temporary navigation hints, not plan edits.
 * Check the entire step against clearance and occupied actor footprints. */
import {doorBlocksRay,passable,type Door,type Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function localDetour(from:Pt,toward:Pt,doors:Door[],
  occupied:Pt[],radius=8):Pt|null{
  const heading=Math.atan2(toward.y-from.y,toward.x-from.x);
  const f={x:Math.cos(heading),y:Math.sin(heading)};
  const side={x:-f.y,y:f.x};
  const candidates:Pt[]=[];
  for(const offset of [16,24,33,41])
    for(const ahead of [12,22,31])
      for(const sign of [1,-1])
        candidates.push({x:from.x+f.x*ahead+side.x*offset*sign,
          y:from.y+f.y*ahead+side.y*offset*sign});
  const safe=(p:Pt)=>{
    if(!passable(p,radius)||occupied.some(o=>distance(p,o)<radius*2+1))
      return false;
    if(doorBlocksRay(doors,{a:from,b:p}))return false;
    const steps=Math.max(2,Math.ceil(distance(from,p)/5));
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      if(!passable({x:from.x+(p.x-from.x)*t,
        y:from.y+(p.y-from.y)*t},radius))return false;
    }
    return true;
  };
  return candidates.filter(safe).sort((a,b)=>
    distance(a,toward)-distance(b,toward))[0]??null;
}
