/** P5.3 — Exact actor-pair LOS caching for one authoritative tick.
 * Every live door state is compared without constructing concatenated
 * strings or arrays on every ray. This never shares recognition or intel.
 */
import type {Door,Pt} from './breach-core.ts';
type Actor={id:string;p:Pt;heading:number;posture:string;health:number};
type SightEntry={
  ax:number;ay:number;ah:number;ap:string;aliveA:number;
  bx:number;by:number;bp:string;aliveB:number;visible:boolean;
};
type DoorSnapshot={
  id:string;kind:Door['kind'];style:Door['style'];
  open:boolean;fraction:number;hinge:Door['hinge'];
  swing:Door['swing'];slideDirection:Door['slideDirection'];
  ax:number;ay:number;bx:number;by:number;
};
const snapDoor=(d:Door):DoorSnapshot=>({
  id:d.id,kind:d.kind,style:d.style,open:d.open,
  fraction:d.openFraction??(d.open?1:0),hinge:d.hinge,
  swing:d.swing,slideDirection:d.slideDirection,
  ax:d.a.x,ay:d.a.y,bx:d.b.x,by:d.b.y
});
export class PerceptionPairCache{
  private time=NaN;
  private geometryKey='';
  private lastDoors:DoorSnapshot[]=[];
  private entries=new Map<string,SightEntry>();
  hits=0;misses=0;invalidations=0;
  private sameDoors(doors:readonly Door[]):boolean{
    if(doors.length!==this.lastDoors.length)return false;
    for(let i=0;i<doors.length;i++){
      const a=doors[i],b=this.lastDoors[i];
      if(a.id!==b.id||a.kind!==b.kind||a.style!==b.style||
         a.open!==b.open||
         (a.openFraction??(a.open?1:0))!==b.fraction||
         a.hinge!==b.hinge||a.swing!==b.swing||
         a.slideDirection!==b.slideDirection||
         a.a.x!==b.ax||a.a.y!==b.ay||
         a.b.x!==b.bx||a.b.y!==b.by)return false;
    }
    return true;
  }
  get(a:Actor,b:Actor,time:number,geometryKey:string,
      doors:readonly Door[],compute:()=>boolean):boolean{
    if(time!==this.time||geometryKey!==this.geometryKey||
       !this.sameDoors(doors)){
      this.time=time;this.geometryKey=geometryKey;
      this.lastDoors=doors.map(snapDoor);
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
