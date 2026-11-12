/** Planning-only, knowledge-safe route preview. Never asks live world
 * geometry, never changes PlanNode[] or claims execution feasibility.
 * At most one route search per 180 ms of active preview interaction. */
import type {Pt} from '../breach-core.ts';
import {routeWithIntel,type IntelState} from '../breach-intel.ts';
import {routeWithSqueezeIntel} from '../breach-squeeze-route.ts';
import {intelRouteFingerprint} from '../breach-route-cache.ts';
export type KnownRoutePreview={
 kind:'normal'|'narrow'|'unavailable';points:readonly Pt[];
 from:Pt;to:Pt;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export class KnownRoutePreviewSampler{
 private previous:KnownRoutePreview|null=null;
 private lastTime=-Infinity;
 private previousIntel:IntelState|null=null;
 private previousRevision=-1;
 private lastKey='';
 private normal:(intel:IntelState,from:Pt,to:Pt)=>Pt[];
 private narrow:(intel:IntelState,from:Pt,to:Pt)=>Pt[];
 private fingerprint:(intel:IntelState)=>string;
 constructor(
  normal:(intel:IntelState,from:Pt,to:Pt)=>Pt[]=routeWithIntel,
  narrow:(intel:IntelState,from:Pt,to:Pt)=>Pt[]=routeWithSqueezeIntel,
  fingerprint:(intel:IntelState)=>string=intelRouteFingerprint){
  this.normal=normal;this.narrow=narrow;this.fingerprint=fingerprint;
 }
 reset(){this.previous=null;this.lastTime=-Infinity;this.previousIntel=null;
  this.previousRevision=-1;this.lastKey='';}
 sample(from:Pt,to:Pt,intel:IntelState,now:number,revision=0):KnownRoutePreview|null{
  if(!Number.isFinite(from.x+from.y+to.x+to.y+now)||
     distance(from,to)<6)return null;
  // A moving finger receives the latest stable proposal. Avoid performing
  // A* on every mousemove / RAF, including when the cursor is stationary.
  if(this.previousIntel===intel&&this.previousRevision===revision&&
     now-this.lastTime<180)return this.previous;
  const key=[Math.round(from.x/8),Math.round(from.y/8),
   Math.round(to.x/8),Math.round(to.y/8),revision,
   this.fingerprint(intel)].join(':');
  if(this.lastKey===key&&this.previous){
   this.lastTime=now;return this.previous;
  }
  const direct=this.normal(intel,from,to);
  const narrow=direct.length?[]:this.narrow(intel,from,to);
  const result:KnownRoutePreview={
   kind:direct.length?'normal':narrow.length?'narrow':'unavailable',
   points:direct.length?direct:narrow,from:{...from},to:{...to}
  };
  this.previous=result;this.previousIntel=intel;
  this.previousRevision=revision;this.lastTime=now;this.lastKey=key;
  return result;
 }
}
