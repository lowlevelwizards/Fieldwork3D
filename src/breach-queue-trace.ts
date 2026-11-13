/** Q0: fully opt-in, bounded, source-attributed threshold motion diagnostics.
 * Never changes collision, motor, authored orders, or GO-time rank.
 */
import type {Pt,Door} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {pendingPassageSlot} from './breach-passage-plan.ts';
export type QueueMotionSource='opening-leaf-yield'|'idle-yield'|'deadlock-retreat-request';
export type QueueMotionEvent={time:number;actor:string;source:QueueMotionSource;
 from:Pt;to:Pt;distance:number};
const listeners=new WeakMap<Session,(event:QueueMotionEvent)=>void>();
export function listenQueueMotion(s:Session,listener:((e:QueueMotionEvent)=>void)|null){
 if(listener)listeners.set(s,listener);
 else listeners.delete(s);
}
export function noteQueueMotion(s:Session,a:TeamActor,source:QueueMotionSource,from:Pt,to:Pt){
 const listener=listeners.get(s);
 if(listener)listener({time:s.seconds,actor:a.id,source,
  from:{...from},to:{...to},distance:Math.hypot(to.x-from.x,to.y-from.y)});
}
const signed=(p:Pt,d:Door)=>{
 const width=Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y)||1;
 return ((p.x-d.a.x)*-(d.b.y-d.a.y)+
  (p.y-d.a.y)*(d.b.x-d.a.x))/width;
};
export type QueueAuditSample={
 time:number;actor:string;door:string|null;rank:number|null;
 depth:number|null;pause:string|null;blocker:string|null;
 speed:number;backward:number;position:Pt;
};
export class QueueMotionAudit {
 private samples:QueueAuditSample[]=[];
 private events:QueueMotionEvent[]=[];
 private last=new Map<string,QueueAuditSample>();
 private tick=0;
 reset(){this.samples=[];this.events=[];this.last.clear();this.tick=0;}
 event(e:QueueMotionEvent){
  this.events.push(e);if(this.events.length>300)this.events.shift();
 }
 sample(s:Session,slots:ReadonlyMap<string,readonly {doorId:string;rank:number;fromSide:-1|1}[]>){
  // Every sixth 60-Hz tick: 10Hz and <=600 samples per member in 60s.
  if(++this.tick%6!==0)return;
  for(const a of s.operators.filter(u=>u.side==='blue'&&u.health>0)){
   const slot=pendingPassageSlot(a.p,slots.get(a.id),s.doors);
   const door=slot&&s.doors.find(d=>d.id===slot.doorId);
   const depth=door?signed(a.p,door)*slot!.fromSide:null;
   const previous=this.last.get(a.id);
   const backward=depth!==null&&previous?.depth!==null&&
     previous?.door===door?.id?Math.max(0,depth-previous.depth):0;
   const sample:QueueAuditSample={time:s.seconds,actor:a.id,
    door:door?.id??null,rank:slot?.rank??null,depth,
    pause:a.motorPause,blocker:a.lastBlocker,speed:a.velocity,
    backward,position:{...a.p}};
   this.last.set(a.id,sample);this.samples.push(sample);
  }
  const cutoff=s.seconds-60;
  while(this.samples.length&&this.samples[0].time<cutoff)this.samples.shift();
  while(this.events.length&&this.events[0].time<cutoff)this.events.shift();
 }
 report(){
  const stationary=this.samples.filter(s=>s.pause==='passage');
  const backwards=stationary.reduce((n,s)=>n+s.backward,0);
  return {samples:this.samples.length,
   waitingSamples:stationary.length,waitingBackward:Math.round(backwards*100)/100,
   sources:this.events.reduce<Record<string,number>>((r,e)=>{
    r[e.source]=(r[e.source]??0)+1;return r;},{}),
   history:this.samples,displacements:this.events};
 }
}