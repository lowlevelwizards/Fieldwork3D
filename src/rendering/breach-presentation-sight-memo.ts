/** P1: per-scene presentation-only optical visibility memo.
 * Never used by AI, tactical sight, acquisition, authoritative fog or film.
 * A result survives across RAFs ONLY if every input to liveVisibility's
 * ground FOV and optical ray test remains equivalent. Fail closed to source
 * evaluation on disabled/replay modes. Camera cutaways never enter this key.
 */
import type {Pt} from '../breach-core.ts';
import {liveVisibility,type Session} from '../breach-game.ts';
import {sessionWorldGeometry} from '../breach-world-context.ts';

export type PresentationSightCategory='decor'|'door'|'opening'|'impact'|'effect';
export type PresentationSightStats=Readonly<{
 queries:number;hits:number;misses:number;bypasses:number;
 invalidations:number;evictions:number;entries:number;
 decorMisses:number;doorMisses:number;openingMisses:number;
 impactMisses:number;effectMisses:number;
}>;
const MAX_ENTRIES=2048;
export class PresentationSightMemo{
 private session:Session|null=null;
 private site:Session['site']|null=null;
 private fingerprint='';
 private reuse=false;
 private readonly values=new Map<string,boolean>();
 private queries=0;private hits=0;private misses=0;private bypasses=0;
 private invalidations=0;private evictions=0;
 private readonly missByKind:Record<PresentationSightCategory,number>={
  decor:0,door:0,opening:0,impact:0,effect:0
 };
 private readonly source:(s:Session,p:Pt)=>boolean;
 constructor(source:(s:Session,p:Pt)=>boolean=liveVisibility){
  this.source=source;
 }
 /** Compare full optical geometry inputs, never just the animation tick.
  * This includes in-place planning changes that leave s.seconds unchanged.
  * JSON tuple boundaries avoid hash collisions that could disclose a point.
  */
 private inputKey(s:Session):string{
  const worldRevision=sessionWorldGeometry(s).revision;
  const actors=s.operators.filter(a=>a.side==='blue').map(a=>[
   a.id,a.side,a.health,a.p.x,a.p.y,a.heading,a.posture
  ]);
  const doors=s.doors.map(d=>[
   d.id,d.a.x,d.a.y,d.b.x,d.b.y,d.kind,d.style,
   d.hinge,d.swing,d.slideDirection,d.open,
   d.openFraction
  ]);
  const cover=s.coverState.map(c=>[
   c.x,c.y,c.w,c.h,c.low,c.fixture,c.destroyed,c.toppled
  ]);
  return JSON.stringify([
   s.objectRevision,worldRevision,s.intel.mode,
   actors,doors,cover
  ]);
 }
 /** Replay is deliberately never memoized; recorded observer samples are
  * governed by replay disclosure, not reconstructed current visibility.
  */
 begin(s:Session,enabled=true):void{
  this.reuse=enabled;
  if(!enabled){
   if(this.values.size||this.session!==s)this.invalidate();
   this.session=s;this.site=s.site??null;this.fingerprint='';
   return;
  }
  const fingerprint=this.inputKey(s);
  if(s!==this.session||s.site!==this.site||
      fingerprint!==this.fingerprint){
   this.invalidate();
   this.session=s;this.site=s.site??null;this.fingerprint=fingerprint;
  }
 }
 /** The point coordinates are part of the key; moving effects cannot reuse
  * a stale result even within one otherwise stationary visibility epoch.
  */
 query(s:Session,category:PresentationSightCategory,
  id:string|number,p:Pt):boolean{
  this.queries++;
  if(!this.reuse||s!==this.session){
   this.bypasses++;return this.source(s,p);
  }
  const key=category+':'+id+':'+p.x+','+p.y;
  const prior=this.values.get(key);
  if(prior!==undefined){
   this.hits++;return prior;
  }
  this.misses++;this.missByKind[category]++;
  const result=this.source(s,p);
  if(this.values.size>=MAX_ENTRIES){
   this.values.clear();this.evictions++;
  }
  this.values.set(key,result);
  return result;
 }
 invalidate():void{
  this.values.clear();
  this.fingerprint='';this.session=null;this.site=null;
  this.invalidations++;
 }
 reset():void{
  this.invalidate();this.reuse=false;
  this.queries=0;this.hits=0;this.misses=0;this.bypasses=0;
  this.invalidations=0;this.evictions=0;
  for(const category of Object.keys(this.missByKind) as
   PresentationSightCategory[])this.missByKind[category]=0;
 }
 stats():PresentationSightStats{
  return {queries:this.queries,hits:this.hits,misses:this.misses,
   bypasses:this.bypasses,invalidations:this.invalidations,
   evictions:this.evictions,entries:this.values.size,
   decorMisses:this.missByKind.decor,doorMisses:this.missByKind.door,
   openingMisses:this.missByKind.opening,impactMisses:this.missByKind.impact,
   effectMisses:this.missByKind.effect};
 }
}
