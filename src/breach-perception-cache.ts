/** P5.3 — Shared geometric actor-pair visibility within a fixed sim tick.
 * Never caches recognition, awareness, sound, or a past remembered target.
 * Every changing ray input is checked; dynamic doors and cover invalidate.
 */
import type {Pt} from './breach-core.ts';
type Actor={
  id:string;p:Pt;heading:number;posture:string;health:number;
};
type SightEntry={
  ax:number;ay:number;ah:number;ap:string;aliveA:number;
  bx:number;by:number;bp:string;aliveB:number;visible:boolean;
};
export class PerceptionPairCache{
  private time=NaN;
  private geometryKey='';
  private doors='';
  private entries=new Map<string,SightEntry>();
  hits=0;misses=0;invalidations=0;
  get(a:Actor,b:Actor,time:number,geometryKey:string,doors:string,
      compute:()=>boolean):boolean{
    if(time!==this.time||geometryKey!==this.geometryKey||
       doors!==this.doors){
      this.time=time;this.geometryKey=geometryKey;this.doors=doors;
      this.entries.clear();this.invalidations++;
    }
    const key=a.id+'>'+b.id;
    const old=this.entries.get(key);
    if(old&&old.ax===a.p.x&&old.ay===a.p.y&&old.ah===a.heading&&
       old.ap===a.posture&&old.aliveA===a.health&&
       old.bx===b.p.x&&old.by===b.p.y&&old.bp===b.posture&&
       old.aliveB===b.health){
      this.hits++;return old.visible;
    }
    const visible=compute();this.misses++;
    this.entries.set(key,{
      ax:a.p.x,ay:a.p.y,ah:a.heading,ap:a.posture,aliveA:a.health,
      bx:b.p.x,by:b.p.y,bp:b.posture,aliveB:b.health,visible
    });
    return visible;
  }
}
