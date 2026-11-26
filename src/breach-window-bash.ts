/** EI4: one physical target and reach contract for the explicit glass-bash
 * order. The pane itself is the only exempted collision volume. */
import {doorBlocksRay,type Pt} from './breach-core.ts';
import type {Session} from './breach-game.ts';
import type {WindowState} from './breach-windows.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {windowBarrierMatches} from './worldgen/window-geometry-contract.ts';
import {segmentHitsBox} from './breach-ray.ts';
import {windowVisualHeadHeight} from './breach-opening-proportions.ts';
export const WINDOW_BASH_REACH=34;
export const WINDOW_BASH_WINDUP=.28;
export function windowBashPoint(w:WindowState,from:Pt):Pt{
 const half=Math.max(0,w.width/2-5);
 const clamp=(v:number,mid:number)=>Math.max(mid-half,Math.min(mid+half,v));
 return w.vertical?{x:w.x,y:clamp(from.y,w.y)}:
   {x:clamp(from.x,w.x),y:w.y};
}
export function windowCanBash(w:WindowState):boolean{
 return !w.shattered&&!w.open&&w.treatment!=='boarded'&&
   (w.sillHeight??14)<=30&&
   (w.headHeight??windowVisualHeadHeight(w.style))>12;
}
export function windowBashLaneClear(s:Session,w:WindowState,from:Pt):boolean{
 const to=windowBashPoint(w,from),world=sessionWorldGeometry(s);
 if(Math.hypot(to.x-from.x,to.y-from.y)>WINDOW_BASH_REACH)return false;
 const ray={a:from,b:to};
 if(world.staticWallBlocksRay(ray)||doorBlocksRay(s.doors,ray))return false;
 return !world.someCoverAlongRay(from,to,o=>!o.destroyed&&
   !windowBarrierMatches(w,o)&&segmentHitsBox(from,to,o));
}
export function nearestBashableWindow(s:Session,from:Pt,
 visible:(p:Pt)=>boolean):WindowState|undefined{
 let target:WindowState|undefined,best=WINDOW_BASH_REACH+.001;
 for(const w of s.windows){
  if(!windowCanBash(w))continue;
  const p=windowBashPoint(w,from),range=Math.hypot(p.x-from.x,p.y-from.y);
  if(range>=best||!visible(p)||!windowBashLaneClear(s,w,from))continue;
  target=w;best=range;
 }
 return target;
}
