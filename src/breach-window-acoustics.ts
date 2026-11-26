import {hardCoveringBlocksTraversal} from './breach-window-covering-physical.ts';
/** A window modifies sound transmission without granting line-of-sight intel. */
import {segmentsCross,type Pt} from './breach-core.ts';
import {windowPaneSegment,type WindowState} from './breach-windows.ts';
export function windowAcousticFactor(from:Pt,to:Pt,
 windows:readonly WindowState[]):number{
 let factor=1;
 const ray={a:from,b:to};
 for(const window of windows){
  if(!segmentsCross(ray,windowPaneSegment(window)))continue;
  if(!window.open&&!window.shattered)factor*=.63;
  if(hardCoveringBlocksTraversal(window))factor*=window.covering?.family==='rolling-shutter'?.55:.75;
 }
 return Math.max(.16,factor);
}
