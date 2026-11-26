/** P5.1 — Deterministic, simulation-tick-delimited budget for nonurgent
 * enemy deliberation. The actor motor, reactions, awareness and firing are
 * never skipped. Deferred choices are retried by the calling AI next tick.
 * No wall-clock time, timers, promises or random state are used. */
export class AiWorkScheduler{
  private tick=-1;
  private used=0;
  private usedUnits=0;
  private admitted=new Set<string>();
  maxUnitsObserved=0;
  readonly maxUnitsPerTick:number;
  readonly maxPerTick:number;
  private readonly actors:Map<string,number>;
  granted=0;
  deferred=0;
  constructor(maxPerTick=2,actors:readonly string[]=[]){
    this.maxPerTick=Math.max(1,Math.floor(maxPerTick));
    this.maxUnitsPerTick=this.maxPerTick*2;
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
    if(tick!==this.tick){this.tick=tick;this.used=0;this.usedUnits=0;this.admitted.clear();}
    if(urgent)return true;
    // A rotating, ordered actor window guarantees that even a constantly
    // requesting guard gets a slot. Merely hashing into three buckets would
    // starve all but the first two guards in a crowded bucket.
    const slot=this.actors.get(id);
    const fair=this.actors.size&&slot!==undefined?
      (slot-(tick*this.maxPerTick)%this.actors.size+
        this.actors.size)%this.actors.size<this.maxPerTick:
      (tick+this.phase(id,kind))%3===0;
    // A route/cover search consumes two units; simple work consumes one.
    // At most one elective job per actor per tick, including chains of
    // positioning and route acquisition. Urgent physical reactions bypass it.
    const units=kind==='idle-defense'||kind==='group-position'||kind==='search-expand'||
      kind==='investigation-route'||kind==='routine-extension'?2:1;
    if(!fair||this.used>=this.maxPerTick||this.admitted.has(id)||
       this.usedUnits+units>this.maxUnitsPerTick){
      this.deferred++;return false;
    }
    this.used++;this.usedUnits+=units;this.admitted.add(id);
    this.maxUnitsObserved=Math.max(this.maxUnitsObserved,this.usedUnits);
    this.granted++;return true;
  }
}
