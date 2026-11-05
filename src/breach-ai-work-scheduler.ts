/** P5.1 — Deterministic, simulation-tick-delimited budget for nonurgent
 * enemy deliberation. The actor motor, reactions, awareness and firing are
 * never skipped. Deferred choices are retried by the calling AI next tick.
 * No wall-clock time, timers, promises or random state are used. */
export class AiWorkScheduler{
  private tick=-1;
  private used=0;
  readonly maxPerTick:number;
  private readonly actors:Map<string,number>;
  granted=0;
  deferred=0;
  constructor(maxPerTick=2,actors:readonly string[]=[]){
    this.maxPerTick=Math.max(1,Math.floor(maxPerTick));
    this.actors=new Map([...new Set(actors)].map((id,index)=>[id,index]));
  }
  private phase(id:string,kind:string){
    let hash=2166136261;
    const text=id+'/'+kind;
    for(let i=0;i<text.length;i++){
      hash=Math.imul(hash^text.charCodeAt(i),16777619);
    }
    return (hash>>>0)%3;
  }
  /** Urgent contact/defense work is always granted; only elective work
   * (idle patrol positioning and search expansion) consumes this budget. */
  allow(id:string,kind:string,tick:number,urgent=false){
    if(tick!==this.tick){this.tick=tick;this.used=0;}
    if(urgent)return true;
    // A rotating, ordered actor window guarantees that even a constantly
    // requesting guard gets a slot. Merely hashing into three buckets would
    // starve all but the first two guards in a crowded bucket.
    const slot=this.actors.get(id);
    const fair=this.actors.size&&slot!==undefined?
      (slot-(tick*this.maxPerTick)%this.actors.size+
        this.actors.size)%this.actors.size<this.maxPerTick:
      (tick+this.phase(id,kind))%3===0;
    if(!fair||this.used>=this.maxPerTick){
      this.deferred++;return false;
    }
    this.used++;this.granted++;return true;
  }
}
