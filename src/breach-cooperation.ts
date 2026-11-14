import type {SessionWorldGeometry} from './breach-world-context.ts';
/** Local micro-detours are temporary navigation hints, not plan edits.
 * Check the entire step against clearance and occupied actor footprints. */
import {type Door,type Pt} from './breach-core.ts';
import {sweptBodyClear} from './breach-navigation.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function localDetour(from:Pt,toward:Pt,doors:Door[],
  occupied:Pt[],radius=8,world?:SessionWorldGeometry):Pt|null{
  const heading=Math.atan2(toward.y-from.y,toward.x-from.x);
  const f={x:Math.cos(heading),y:Math.sin(heading)};
  const side={x:-f.y,y:f.x};
  // Evaluate candidates in their historical stable iteration order,
  // retaining only the best legal candidate. The recovery motor previously
  // allocated 24 points, a filtered array and a sorted array per attempt.
  // Strict < preserves the stable-sort winner when distances tie.
  let best:Pt|null=null,bestDistance=Infinity;
  for(const offset of [16,24,33,41])
    for(const ahead of [12,22,31])
      for(const sign of [1,-1]){
        const p={x:from.x+f.x*ahead+side.x*offset*sign,
          y:from.y+f.y*ahead+side.y*offset*sign};
        if(occupied.some(o=>distance(p,o)<radius*2+1)||
           !sweptBodyClear(from,p,doors,radius,world))continue;
        const gap=distance(p,toward);
        if(gap<bestDistance){best=p;bestDistance=gap;}
      }
  return best;
}
