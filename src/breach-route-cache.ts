/** Visual-only route cache. Never trusted by the movement motor.
 * Plans, local origin cell, known topology and exact goal form the key. */
import {type Pt,WALLS,COVER,activeSite} from './breach-core.ts';
import {type IntelState,routeWithIntel} from './breach-intel.ts';
import {routeWithSqueezeIntel} from './breach-squeeze-route.ts';
export type DisplayRoute={points:readonly Pt[];narrowOnly:boolean};
export function intelRouteFingerprint(intel:IntelState){
  const sorted=(items:Iterable<string|number>)=>Array.from(items).sort().join(',');
  const doors=Array.from(intel.doorMemory).sort(([a],[b])=>a.localeCompare(b))
    .map(([id,angle])=>id+':'+angle.toFixed(2)).join(',');
  return [intel.mode,sorted(intel.walls),sorted(intel.cover),
    sorted(intel.doors),doors,activeSite()?.seed??'standard',
    WALLS.length,COVER.length].join('|');
}
export class DisplayRouteCache{
  private knownKey='';
  private cache=new Map<string,DisplayRoute>();
  readonly sizeLimit=180;
  invalidations=0;computations=0;
  get(from:Pt,to:Pt,intel:IntelState):DisplayRoute{
    const known=intelRouteFingerprint(intel);
    if(this.knownKey!==known){
      this.cache.clear();this.knownKey=known;this.invalidations++;
    }
    // Use a broad origin bin only for visual routes; physical motor paths
    // remain exact. A moving actor must not trigger A* every frame.
    const grid=12;
    const ox=Math.round(from.x/grid)*grid,oy=Math.round(from.y/grid)*grid;
    const key=ox+','+oy+'>'+to.x.toFixed(2)+','+to.y.toFixed(2);
    const cached=this.cache.get(key);
    if(cached)return cached;
    const snapped={x:ox,y:oy};
    const normal=routeWithIntel(intel,snapped,to);
    const points=normal.length?normal:routeWithSqueezeIntel(intel,snapped,to);
    const value={points,narrowOnly:!normal.length&&!!points.length};
    if(this.cache.size>=this.sizeLimit)
      this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key,value);this.computations++;
    return value;
  }
  clear(){this.cache.clear();this.knownKey='';}
}