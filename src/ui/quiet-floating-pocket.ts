/** Hard-gated, edge-only placement for optional floating tactical actions.
 * A crowded or visibly open tactical viewport returns null instead of
 * choosing a "least bad" obstruction. No hidden-world knowledge is used here.
 */
import {pathOverlapsRect,type ScreenPath,type ScreenPoint,
  type ScreenRect} from '../breach-context-placement.ts';

export type QuietPocketOptions={
  width:number;height:number;viewportWidth:number;top:number;bottom:number;
  protectedRects:readonly ScreenRect[];
  protectedPaths:readonly ScreenPath[];
  previous?:ScreenPoint|null;
};
const overlap=(a:ScreenRect,b:ScreenRect,pad:number)=>
  a.x < b.x+b.w+pad && a.x+a.w > b.x-pad &&
  a.y < b.y+b.h+pad && a.y+a.h > b.y-pad;
export function quietFloatingPocket(o:QuietPocketOptions):ScreenPoint|null{
  const {width:w,height:h,viewportWidth:v,top,bottom}=o;
  if(![w,h,v,top,bottom].every(Number.isFinite)||
    w<=0||h<=0||v<w+16||bottom-top<h+12)return null;
  const left=8,right=v-w-8;
  const last=o.previous;
  const xs=[left,right];
  const bottomY=bottom-h-6;
  const ys=[top+6,bottomY];
  for(let i=1;i<11;i++)ys.push(top+6+(bottomY-top-6)*i/11);
  if(last)ys.unshift(last.y);
  let best:ScreenPoint|null=null,score=Infinity;
  const seen=new Set<string>();
  for(const x of xs)for(const y0 of ys){
    const y=Math.min(bottomY,Math.max(top+6,y0));
    if(y<top||y+h>bottom)continue;
    const key=Math.round(x)+':'+Math.round(y);
    if(seen.has(key))continue;
    seen.add(key);
    const rect={x,y,w,h};
    if(o.protectedRects.some(zone=>overlap(rect,zone,9)))continue;
    if(o.protectedPaths.some(path=>pathOverlapsRect(path,rect,18)))
      continue;
    // Once safe, stability beats proximity to the active operator.
    const delta=last?Math.hypot(x-last.x,y-last.y):0;
    const previousFit=last&&Math.hypot(x-last.x,y-last.y)<14?-2000:0;
    const candidateScore=delta*.32+previousFit+
      (x===right?2:0)+Math.abs(y-(top+bottom-h)/2)*.005;
    if(candidateScore<score){best={x,y};score=candidateScore;}
  }
  return best;
}
