/** P5.2 — Exact-origin, geometry-revision-scoped physical route memo.
 * Unlike visual DisplayRouteCache this is used by enemy motor/navigation.
 * No origin snapping or approximate result reuse is permitted.
 * Callers keep ownership of each route array and all waypoint objects. */
import type {Pt} from './breach-core.ts';

type Entry={points:readonly Pt[];expires:number};
const copy=(points:readonly Pt[]):Pt[]=>points.map(p=>({x:p.x,y:p.y}));
export class TacticalRouteCache{
  private revision=-1;
  private entries=new Map<string,Entry>();
  hits=0;misses=0;invalidations=0;
  readonly limit=160;
  /** A miss is remembered for a bounded 12 ticks. A topology change
   * invalidates it immediately, so a moved obstacle cannot trap an actor. */
  get(from:Pt,to:Pt,revision:number,tick:number,profile:string,
      calculate:()=>Pt[]):Pt[]{
    if(revision!==this.revision){
      this.revision=revision;this.entries.clear();this.invalidations++;
    }
    const key=profile+'|'+from.x+','+from.y+'>'+to.x+','+to.y;
    const found=this.entries.get(key);
    if(found&&(found.points.length||tick<=found.expires)){
      this.hits++;
      return copy(found.points);
    }
    this.misses++;
    const points=copy(calculate());
    if(this.entries.size>=this.limit)
      this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key,{points,expires:points.length?Infinity:tick+12});
    return copy(points);
  }
  clear(){this.entries.clear();this.revision=-1;}
}
