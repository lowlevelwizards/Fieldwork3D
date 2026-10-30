/** Local micro-detours are temporary navigation hints, not plan edits.
 * Check the entire step against clearance and occupied actor footprints. */
import {type Door,type Pt} from './breach-core.ts';
import {sweptBodyClear} from './breach-navigation.ts';
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
    return !occupied.some(o=>distance(p,o)<radius*2+1)&&
      sweptBodyClear(from,p,doors,radius);
  };
  return candidates.filter(safe).sort((a,b)=>
    distance(a,toward)-distance(b,toward))[0]??null;
}
