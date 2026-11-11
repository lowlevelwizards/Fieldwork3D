import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAfterActionTimeline,clusterAfterActionTimeline,
 timelineTime,TIMELINE_FILTERS}
 from '../src/breach-after-action-timeline.ts';
import {renderAfterActionTimeline}
 from '../src/ui/breach-after-action-timeline.ts';
import {renderStructuredMissionDetails}
 from '../src/ui/breach-after-action-mission-details.ts';
import {makeAfterActionLaunchRequest}
 from '../src/breach-after-action-replay-navigation.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const event=(id,t,kind,more={})=>({id,t,kind,text:kind.toUpperCase(),
 actor:'rook',p:{x:3,y:5},...more});
const shot=(id,recordedAt,target='guard',hit=true)=>({
 id,recordedAt,shooterId:'rook',targetId:target,hit,
 healthBefore:4,healthAfter:hit?3:4,down:false,
 start:{x:0,y:0},end:{x:5,y:0},surface:hit?'blood':'dust'
});
const recording=()=>({
 duration:95,
 events:[event(2,20,'wound'),event(1,2,'intel'),
  event(3,20,'objective'),event(4,32,'shot')],
 executionEvents:[
  {id:7,t:8,kind:'waiting',actor:'moss',text:'HOLD',orderId:2,reason:'contact'},
  {id:8,t:11,kind:'blocked',actor:'moss',text:'DOOR BLOCKED',orderId:2,reason:'door'},
  {id:9,t:14,kind:'resumed',actor:'moss',text:'ADVANCING',orderId:2,reason:'clear'}],
 ballistics:{shots:[shot(100,20),shot(101,43,'guard',false)]},
 frames:[{t:0,actors:[]},{t:95,actors:[]}],
 completeness:{complete:true},
 manifest:{actors:[
  {id:'rook',name:'ROOK',side:'blue'},
  {id:'moss',name:'MOSS',side:'blue'},
  {id:'guard',name:'GUARD',side:'red'}]}
});
class FakeElement{
 constructor(tag){this.tagName=tag.toUpperCase();this.className='';
  this.textContent='';this.style={};this.dataset={};this.children=[];
  this.attributes=new Map();this.listeners=new Map();this.disabled=false;}
 setAttribute(key,value){this.attributes.set(key,String(value));}
 getAttribute(key){return this.attributes.get(key)??null;}
 append(...items){this.children.push(...items);}
 addEventListener(key,callback){this.listeners.set(key,callback);}
 click(){if(!this.disabled)this.listeners.get('click')?.();}
}
function withDom(fn){
 const previous=globalThis.document;
 globalThis.document={createElement:t=>new FakeElement(t)};
 try{return fn();}
 finally{if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;}
}
const find=(el,predicate)=>[el,...el.children.flatMap(c=>find(c,predicate))]
 .filter(predicate);
const text=(el)=>el.textContent+el.children.map(text).join(' ');

test('V4-5 complete event index retains every battle, execution and ballistic ID with original time',()=>{
 const events=buildAfterActionTimeline(recording());
 assert.deepEqual(events.map(e=>e.key),[
  'battle:1','execution:7','execution:8','execution:9',
  'battle:2','battle:3','shot:100','battle:4','shot:101']);
 assert.equal(events.filter(e=>e.source==='execution').length,3);
 assert.equal(events.find(e=>e.key==='shot:100').shotId,100);
 assert.equal(events.find(e=>e.key==='shot:100').t,20);
 assert.equal(events.find(e=>e.key==='shot:100').category,'casualty');
 assert.equal(events.find(e=>e.key==='shot:101').text,'SHOT MISSED');
 assert.equal(events.find(e=>e.key==='battle:1').category,'contact');
 assert.equal(events.find(e=>e.key==='battle:3').category,'objective');
 assert.deepEqual(TIMELINE_FILTERS.slice(0,3),['all','contact','combat']);
});

test('V4-5 lossless clustered bins preserve hundreds of dense events and representative severity',()=>{
 const rec=recording();
 rec.events=Array.from({length:500},(_,i)=>event(i+1,50+(i%50)*.001,
  i===63?'down':'shot'));
 const indexed=buildAfterActionTimeline(rec);
 const clustered=clusterAfterActionTimeline(indexed,95,480);
 assert.ok(clustered.length<=10);
 assert.equal(clustered.reduce((sum,c)=>sum+c.count,0),indexed.length);
 assert.deepEqual(clustered.flatMap(c=>c.events.map(e=>e.key)).sort(),
  indexed.map(e=>e.key).sort());
 const group=clustered.find(c=>c.events.some(e=>e.kind==='down'));
 assert.equal(group.representative.kind,'down');
 const filtered=clusterAfterActionTimeline(indexed,95,480,'casualty');
 assert.equal(filtered.flatMap(c=>c.events).length,2,
   'Recorded damaging hit and added down event both remain accessible');
 assert.ok(filtered.some(c=>c.representative.kind==='down'));
 assert.ok(filtered.flatMap(c=>c.events).some(e=>
   e.source==='shot'&&e.category==='casualty'));
});

test('V4-5 chronology excludes malformed/future records; empty partial missions remain factual',()=>{
 const rec=recording();
 rec.events.push(event(88,NaN,'down'),event(89,120,'objective'));
 rec.ballistics.shots.push(shot(999,-12));
 const indexed=buildAfterActionTimeline(rec);
 assert.equal(indexed.some(e=>e.key==='battle:88'||e.key==='battle:89'
  ||e.key==='shot:999'),false);
 assert.equal(timelineTime(65),'1:05');
 assert.equal(timelineTime(-1),'—');
 assert.deepEqual(buildAfterActionTimeline({...rec,duration:NaN}),[]);
});

test('V4-5 event watch clip uses existing exact shot and generic time anchors',()=>{
 const rec=recording(),events=buildAfterActionTimeline(rec);
 const direct=events.find(e=>e.key==='shot:100');
 const clip=makeAfterActionLaunchRequest(rec,{
  surface:'timeline',time:direct.t,contactId:direct.targetId,
  shotId:direct.shotId});
 assert.deepEqual(clip.range,{start:20,end:20});
 assert.equal(clip.shotId,100);
 const generic=events.find(e=>e.key==='battle:3');
 const other=makeAfterActionLaunchRequest(rec,{
  surface:'timeline',time:generic.t});
 assert.deepEqual(other.range,{start:20,end:20});
});

test('V4-5 inspector renders every cluster member, valid filters, active card and paged full ledger',()=>withDom(()=>{
 const rec=recording(),events=buildAfterActionTimeline(rec);
 const actions={filter:()=>{},select:()=>{},selectCluster:()=>{},
  ledger:()=>{},more:()=>{},watch:()=>{},inspect:()=>{},highlights:()=>{}};
 const model={filter:'all',selectedKey:'shot:100',clusterId:null,
  ledgerOpen:true,ledgerLimit:3};
 const root=renderAfterActionTimeline({events,duration:95,width:320,
  state:model,actions,complete:false,actorName:id=>id.toUpperCase(),
  canInspect:event=>event.shotId!==null,highlightsAvailable:true});
 assert.match(text(root),/PARTIAL RECORDING/);
 assert.match(text(root),/BALLISTIC #100/);
 const shown=find(root,e=>e.className==='fw-v5-timeline-ledger-item');
 assert.equal(shown.length,3);
 assert.equal(find(root,e=>e.className==='fw-v5-timeline-more').length,1);
 const markers=find(root,e=>e.className==='fw-v5-timeline-marker');
 assert.ok(markers.length>0);
 assert.ok(markers.every(e=>Number(e.style.left.replace('px',''))>=24));
 assert.equal(find(root,e=>e.className==='fw-v5-timeline-inspect')[0]
  .dataset.timelineSelectedKey,'shot:100');
 const allMarkers=markers.reduce((sum,e)=>
   sum+1,0);
 assert.ok(allMarkers<events.length+1);
}));

test('V4-5 structured outcome is authoritative while pacing is observational and campaign stays visible',()=>withDom(()=>{
 const rec=recording();
 rec.events.push(event(20,65,'objective',{text:'MISSION COMPLETE'}));
 const summary=renderStructuredMissionDetails({
  name:'Warehouse Block',stats:{
   grade:'B',score:81,time:95,objective:true,
   survived:3,shots:40,hits:19,accuracy:47.5,
   casualties:1,pauses:5,rescueStatus:'none',
   squad:[{name:'ROOK',survived:true,injury:false,fired:12},
    {name:'MOSS',survived:true,injury:true,fired:8},
    {name:'ASH',survived:false,injury:true,fired:2}]
  },recorder:{...rec,completeness:{complete:false}},
  campaign:null,campaignMode:'quick',operationsLogged:0,phase:'won'
 });
 const result=text(summary);
 assert.match(result,/WAREHOUSE BLOCK/);
 assert.match(result,/SCORE 81/);
 assert.match(result,/SURVIVORS 3/);
 assert.match(result,/FIRST GUNFIRE/);
 assert.match(result,/QUICK PLAY/);
 assert.match(result,/REPLAY INCOMPLETE/);
 assert.doesNotMatch(result,/TACTICAL TIMELINE\n/);
}));

test('V4-5 details state, recap and navigation are owned by existing After Action controller',()=>{
 const html=source('index.html');
 const ui=source('src/ui/breach-after-action-controller.ts');
 const debrief=source('src/ui/breach-mission-debrief.ts');
 assert.match(html,/id="afterActionTimeline"/);
 assert.match(html,/id="afterActionMissionDetails"/);
 assert.doesNotMatch(html,/FULL REPORT \/ MISSION TIMELINE/);
 assert.match(ui,/timelineSelectedKey:s\.timelineSelectedKey/);
 assert.match(ui,/timelineFilter:s\.timelineFilter/);
 assert.match(ui,/s\.timelineSelectedKey=context\.timelineSelectedKey/);
 assert.match(ui,/surface:'timeline'/);
 assert.match(ui,/s\.tab='combat'/);
 assert.match(ui,/s\.tab='highlights'/);
 assert.match(debrief,/renderStructuredMissionDetails/);
 assert.doesNotMatch(debrief,/formatAfterAction\(/);
 assert.doesNotMatch(debrief,/formatCombatReview\(/);
});
