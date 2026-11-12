/** V4 Stage 5 — mission event timeline inside the existing Details dialog.
 * This view consumes the indexed recording only; playback and mission
 * progression remain owned by their existing controllers.
 */
import type {AfterActionTimelineEvent,TimelineFilter}
 from '../breach-after-action-timeline.ts';
import {clusterAfterActionTimeline,matchesTimelineFilter,selectTimelineEvents,timelineCategoryName,timelineTime,
 TIMELINE_FILTERS} from '../breach-after-action-timeline.ts';

export type TimelineViewState={
 filter:TimelineFilter;selectedKey:string|null;ledgerOpen:boolean;
 ledgerLimit:number;clusterId:string|null;
};
export type TimelineViewActions={
 filter:(value:TimelineFilter)=>void;
 select:(key:string)=>void;
 selectCluster:(id:string,key:string)=>void;
 ledger:(open:boolean)=>void;more:()=>void;
 watch:(event:AfterActionTimelineEvent)=>void;
 inspect:(event:AfterActionTimelineEvent)=>void;
 highlights:()=>void;
};
const make=(tag:string,cls='',text?:string):HTMLElement=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(text!==undefined)x.textContent=text;return x;
};
const button=(label:string,click:()=>void,cls='fw-v5-timeline-button')=>{
 const b=make('button',cls,label) as HTMLButtonElement;
 b.type='button';b.addEventListener('click',click);return b;
};
const eventLabel=(e:AfterActionTimelineEvent):string=>
 e.text?.trim()||e.kind.replaceAll('-',' ').toUpperCase();
const sortKey=(e:AfterActionTimelineEvent)=>
 e.category.toUpperCase()+' · '+(e.source==='shot'?
   'BALLISTIC #'+e.shotId:e.source.toUpperCase());
const boundedWidth=(width:number)=>Math.max(480,Math.min(930,
 Number.isFinite(width)?width:640));
export function renderAfterActionTimeline(input:{
 events:readonly AfterActionTimelineEvent[];duration:number;
 width:number;complete:boolean;state:TimelineViewState;
 actions:TimelineViewActions;actorName:(id:string)=>string;
 inspectLabel:(e:AfterActionTimelineEvent)=>string|null;
 highlightsAvailable:boolean;
}):HTMLElement{
 const {events,duration,state,actions,actorName,complete,
  inspectLabel,highlightsAvailable}=input;
 const root=make('section','fw-v5-timeline');
 root.setAttribute('aria-label','Recorded mission timeline');
 const filtered=selectTimelineEvents(events,state.filter,duration);
 const heading=make('header','fw-v5-timeline-heading');
 heading.append(make('h3','', 'TACTICAL TIMELINE'),
   make('small','',state.filter==='key'?
   filtered.length+' KEY MOMENTS · '+events.length+' SOURCE EVENTS':
   filtered.length+' OF '+events.length+' RECORDED EVENTS'));
 root.append(heading);
 if(!complete)root.append(make('p','fw-v5-timeline-warning',
   'PARTIAL RECORDING · missing events are not reconstructed'));
 const chips=make('div','fw-v5-timeline-filters');
 chips.setAttribute('role','group');
 chips.setAttribute('aria-label','Timeline event categories');
 for(const filter of TIMELINE_FILTERS){
   const count=selectTimelineEvents(events,filter,duration).length;
   if(filter!=='all'&&!count)continue;
   const b=button(timelineCategoryName(filter)+' '+count,
     ()=>actions.filter(filter),'fw-v5-timeline-filter');
   b.setAttribute('aria-pressed',String(state.filter===filter));
   b.dataset.timelineFilter=filter;
   chips.append(b);
 }
 root.append(chips);
 if(!events.length||duration<=0){
   root.append(make('p','fw-after-empty',
     'NO TIMED EVENTS RECORDED · mission outcome and equipment remain available'));
   return root;
 }
 if(!filtered.length){
   root.append(make('p','fw-after-empty','NO EVENTS IN THIS CATEGORY'));
   return root;
 }
 const width=boundedWidth(input.width);
 const clusters=clusterAfterActionTimeline(events,duration,width,state.filter);
 const selected=filtered.find(e=>e.key===state.selectedKey)??
   filtered.slice().sort((a,b)=>b.priority-a.priority||a.t-b.t)[0];
 const selectedCluster=clusters.find(c=>c.events.some(e=>e.key===selected.key))??
   clusters[0];
 const activeCluster=clusters.find(c=>c.id===state.clusterId)??
   selectedCluster;
 const nav=make('div','fw-v5-timeline-ruler');
 const railHint=make('p','fw-v5-timeline-hint',
   state.filter==='key'?'Selected turning points · choose All Events for the full record':
   'Markers show actual recorded times · swipe to explore');
 const rail=make('div','fw-v5-timeline-rail');
 rail.setAttribute('aria-label','Scroll horizontally to inspect timeline clusters');
 rail.tabIndex=0;
 const track=make('div','fw-v5-timeline-track');
 track.style.width=width+'px';
 track.append(make('div','fw-v5-timeline-axis'));
 for(const cluster of clusters){
   const marker=button(cluster.count>1?String(cluster.count):'•',
     ()=>actions.selectCluster(cluster.id,
       cluster.events.slice().sort((a,b)=>b.priority-a.priority||
         a.t-b.t)[0].key),
     'fw-v5-timeline-marker');
   const x=Math.max(24,Math.min(width-24,
     Math.round(cluster.time/duration*width)));
   marker.style.left=x+'px';
   marker.dataset.category=cluster.representative.category;
   marker.dataset.priority=cluster.representative.priority>=8?'major':'ordinary';
   marker.dataset.timelineCluster=cluster.id;
   marker.setAttribute('aria-label',
     timelineTime(cluster.time)+' · '+
     cluster.count+' recorded event'+(cluster.count===1?'':'s')+
     ' · '+timelineCategoryName(cluster.representative.category));
   marker.setAttribute('aria-pressed',String(cluster.id===activeCluster.id));
   track.append(marker);
 }
 rail.append(track);
 nav.append(make('small','',timelineTime(0)),rail,
   make('small','',timelineTime(duration)));
 root.append(railHint,nav);
 const group=make('section','fw-v5-timeline-group');
 group.append(make('h4','',activeCluster.events.length+
   ' EVENT'+(activeCluster.events.length===1?'':'S')+
   ' · '+timelineTime(activeCluster.time)));
 const groupScroll=make('div','fw-v5-timeline-group-items');
 for(const e of activeCluster.events){
   const item=button(timelineTime(e.t)+'  '+eventLabel(e),
     ()=>actions.select(e.key),'fw-v5-timeline-cluster-event');
   item.dataset.timelineEventKey=e.key;
   item.dataset.category=e.category;
   item.setAttribute('aria-pressed',String(e.key===selected.key));
   groupScroll.append(item);
 }
 group.append(groupScroll);
 root.append(group);
 const card=make('section','fw-v5-timeline-inspect');
 card.setAttribute('aria-label','Selected recorded incident');
 card.dataset.timelineSelectedKey=selected.key;
 const eyebrow=make('div','fw-v5-timeline-inspect-eyebrow',
   timelineTime(selected.t)+' · '+sortKey(selected));
 const title=make('h4','',eventLabel(selected));
 card.append(eyebrow,title);
 const who=selected.actorId?actorName(selected.actorId):'ACTOR NOT RECORDED';
 card.append(make('p','fw-v5-timeline-actor',
   'ACTOR: '+who+
   (selected.targetId?' · TARGET: '+actorName(selected.targetId):'')));
 const order=filtered.indexOf(selected);
 const step=make('div','fw-v5-timeline-step');
 const prev=button('‹ PREVIOUS',()=>actions.select(
   filtered[Math.max(0,order-1)].key));
 const next=button('NEXT ›',()=>actions.select(
   filtered[Math.min(filtered.length-1,order+1)].key));
 prev.disabled=order<=0;next.disabled=order>=filtered.length-1;
 prev.dataset.timelineStep='previous';
 next.dataset.timelineStep='next';
 step.append(prev,make('small','',String(order+1)+' / '+filtered.length),next);
 card.append(step);
 const controls=make('div','fw-v5-timeline-actions');
 controls.append(button('▶ WATCH CLIP',()=>actions.watch(selected),
   'fw-v5-timeline-primary'));
 const inspection=inspectLabel(selected);
 if(inspection)controls.append(button(inspection,
   ()=>actions.inspect(selected)));
 if(highlightsAvailable)controls.append(button('OPEN HIGHLIGHTS',
   actions.highlights));
 card.append(controls);root.append(card);
 const ledger=make('section','fw-v5-timeline-ledger');
 const toggle=button('CHRONOLOGICAL LEDGER · '+filtered.length+
   (state.ledgerOpen?'  ▴':'  ▾'),
   ()=>actions.ledger(!state.ledgerOpen),'fw-v5-timeline-ledger-toggle');
 toggle.setAttribute('aria-expanded',String(state.ledgerOpen));
 ledger.append(toggle);
 if(state.ledgerOpen){
   const list=make('div','fw-v5-timeline-ledger-list');
   for(const event of filtered.slice(0,Math.max(1,state.ledgerLimit))){
     const row=button(timelineTime(event.t)+' · '+eventLabel(event),
       ()=>actions.select(event.key),'fw-v5-timeline-ledger-item');
     row.dataset.timelineEventKey=event.key;
     row.setAttribute('aria-pressed',String(event.key===selected.key));
     list.append(row);
   }
   ledger.append(list);
   if(filtered.length>state.ledgerLimit)ledger.append(button(
     'SHOW '+Math.min(30,filtered.length-state.ledgerLimit)+
     ' MORE · '+(filtered.length-state.ledgerLimit)+' REMAIN',
     actions.more,'fw-v5-timeline-more'));
 }
 root.append(ledger);
 return root;
}
