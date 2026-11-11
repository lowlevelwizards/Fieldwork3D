/** After Action V4-5: immutable, complete retrospective event index.
 * Events are NEVER synthesized from simulation state or upcoming replay frames.
 * The existing replay index and shot recorder provide stable evidence IDs;
 * clusters are a visualization only and cannot discard their members.
 */
import type {MissionRecorder} from './breach-replay.ts';
import {ReplayEventIndex} from './breach-replay-event-index.ts';
import {clusterReplayTimeline,replayTimelineBins}
 from './breach-replay-timeline-markers.ts';
import {shotOutcome} from './breach-after-action-report.ts';

export type TimelineCategory='contact'|'combat'|'casualty'|'entry'|
 'objective'|'movement'|'other';
export type TimelineFilter='all'|TimelineCategory;
export type AfterActionTimelineEvent={
 key:string;source:'battle'|'execution'|'shot';
 t:number;kind:string;category:TimelineCategory;priority:number;
 text:string;actorId:string|null;targetId:string|null;
 shotId:number|null;order:number;
};
export type AfterActionTimelineCluster={
 id:string;index:number;time:number;kind:string;count:number;
 representative:AfterActionTimelineEvent;
 events:readonly AfterActionTimelineEvent[];
};
export const TIMELINE_FILTERS:readonly TimelineFilter[]=[
 'all','contact','combat','casualty','entry','objective','movement'
];
const category=(kind:string):TimelineCategory=>{
 if(kind==='intel')return 'contact';
 if(kind==='down'||kind==='wound'||kind==='surrender')return 'casualty';
 if(kind==='shot'||kind==='impact'||kind==='reload')return 'combat';
 if(kind==='door'||kind==='flash'||kind==='interaction')return 'entry';
 if(kind==='objective')return 'objective';
 if(['blocked','resumed','waiting','recovering','completed'].includes(kind))
   return 'movement';
 return 'other';
};
const priority=(kind:string):number=>
 kind==='down'||kind==='objective'?10:
 kind==='wound'?9:kind==='surrender'?8:kind==='intel'?7:
 kind==='flash'?6:kind==='blocked'?5:kind==='shot'?4:
 kind==='door'?3:kind==='impact'?2:1;
const clean=(t:number,duration:number)=>Number.isFinite(t)&&t>=0&&
 t<=duration+.15;
/** Same immutable archive evidence as replay; unlike replay's compact
 * marker view this index also exposes the less significant execution events.
 */
export function buildAfterActionTimeline(
 rec:MissionRecorder
):readonly AfterActionTimelineEvent[]{
 const duration=rec.duration;
 if(!Number.isFinite(duration)||duration<0)return [];
 const replay=new ReplayEventIndex(rec.events,rec.executionEvents);
 const input:AfterActionTimelineEvent[]=[];
 const indexed=new Set(replay.all.map(e=>e.key));
 for(const [i,e] of replay.all.entries()){
   if(!clean(e.t,duration))continue;
   const battle=e.source==='battle'?
     rec.events.find(x=>'battle:'+x.id===e.key):null;
   input.push({key:e.key,source:e.source,t:e.t,kind:e.kind,
     category:category(e.kind),priority:priority(e.kind),
     text:e.text,actorId:e.actor??null,
     targetId:battle?.meta?.targetId??null,
     shotId:null,order:i});
 }
 // ReplayEventIndex intentionally omits some low-priority execution states
 // for transport navigation. The after-action full report must not.
 for(const [i,e] of rec.executionEvents.entries()){
   const key='execution:'+e.id;
   if(indexed.has(key)||!clean(e.t,duration))continue;
   input.push({key,source:'execution',t:e.t,kind:e.kind,
     category:category(e.kind),priority:priority(e.kind),
     text:e.text,actorId:e.actor??null,targetId:null,
     shotId:null,order:rec.events.length+i});
 }
 for(const [i,shot] of rec.ballistics.shots.entries()){
   if(!clean(shot.recordedAt,duration))continue;
   const outcome=shotOutcome(shot);
   const text=outcome==='miss'?'SHOT MISSED':
     outcome==='armor-stopped'?'ARMOR STOPPED SHOT':
     outcome==='damaging'?'DAMAGING HIT':
     outcome==='non-damaging'?'HIT · NO DAMAGE':'SHOT · DAMAGE UNKNOWN';
   input.push({key:'shot:'+shot.id,source:'shot',t:shot.recordedAt,
     kind:'shot',category:outcome==='damaging'?'casualty':'combat',
     priority:outcome==='damaging'?9:4,
     text,actorId:shot.shooterId,targetId:shot.targetId,
     shotId:shot.id,order:rec.events.length+rec.executionEvents.length+i});
 }
 input.sort((a,b)=>a.t-b.t||a.order-b.order||a.key.localeCompare(b.key));
 return input;
}
/** Cluster into the existing replay transport's time bins.
 * A representative is decorative: every underlying event is retained.
 */
export function clusterAfterActionTimeline(
 events:readonly AfterActionTimelineEvent[],duration:number,
 trackWidth:number,filter:TimelineFilter='all'
):readonly AfterActionTimelineCluster[]{
 const displayed=events.filter(e=>filter==='all'||e.category===filter);
 if(!displayed.length||!Number.isFinite(duration)||duration<=0)return [];
 const bins=replayTimelineBins(Math.max(1,trackWidth)*.48);
 const markers=clusterReplayTimeline(displayed,duration,
   Math.max(1,trackWidth)*.48);
 const groups=new Map<number,AfterActionTimelineEvent[]>();
 for(const event of displayed){
   const index=Math.min(bins-1,Math.max(0,
     Math.floor(event.t/duration*bins)));
   const group=groups.get(index)??[];
   group.push(event);groups.set(index,group);
 }
 return markers.map(m=>{
   const members=groups.get(m.index)??[];
   const representative=members.reduce((best,item)=>
     item.priority>best.priority?item:best,members[0]);
   return {id:'bin:'+m.index,index:m.index,time:m.time,
     kind:representative.kind,count:members.length,
     representative,events:members};
 });
}
export const timelineTime=(seconds:number):string=>{
 if(!Number.isFinite(seconds)||seconds<0)return '—';
 const s=Math.floor(seconds);
 return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
};
export const timelineCategoryName=(category:TimelineFilter):string=>
 category==='all'?'ALL EVENTS':category.toUpperCase();
