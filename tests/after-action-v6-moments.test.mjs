import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectTimelineEvents,clusterAfterActionTimeline}
 from '../src/breach-after-action-timeline.ts';
import {featuredReplayIncidents} from '../src/breach-replay-incidents.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V6.4 key overview curates rather than calling 50 events 50 key moments',()=>{
 const events=Array.from({length:70},(_,i)=>({
  key:'event:'+i,t:i*.28,priority:i%5===0?10:9,
  category:i%5===0?'objective':'casualty',
  source:'battle',kind:'wound',order:i,text:'WOUND',
  actorId:'rook',targetId:'guard',shotId:null
 }));
 const selected=selectTimelineEvents(events,'key',20);
 assert.ok(selected.length<=5);
 assert.equal(selectTimelineEvents(events,'all',20).length,70);
 assert.equal(clusterAfterActionTimeline(events,20,480,'all')
  .reduce((sum,g)=>sum+g.events.length,0),70);
 assert.ok(selected.some(event=>event.category==='objective'));
});
test('V6.4 moments suppress repetitive objective-only featured cards',()=>{
 const events=[0,8,16].map((start,i)=>({
  id:'i'+i,start,end:start+2,kind:'objective',
  label:'OBJECTIVE REACHED',score:10-i,actorIds:[],
  eventKeys:[],eventCount:1,summary:'Objective event'
 }));
 assert.equal(featuredReplayIncidents(events,5).length,1);
});
test('V6.4 one timeline follows the Moments tab without replacing event state',()=>{
 const ctrl=source('src/ui/breach-after-action-controller.ts');
 const html=source('index.html');
 assert.match(html,/data-after-tab="highlights" aria-pressed="false">MOMENTS/);
 assert.match(ctrl,/timelineMount\.replaceWith\(timelineHost\)/);
 assert.match(ctrl,/timelineDock\.append\(timelineHost\)/);
 assert.match(ctrl,/s\.tab!=='highlights'/);
 assert.match(ctrl,/timelineSelectedKey:s\.timelineSelectedKey/);
});

test('V6 clip navigation prefers eligible director view, keeping bodycam optional',()=>{
 const controller=source('src/ui/breach-after-action-controller.ts');
 const start=controller.indexOf('const shot=detail.shotId==null?null:');
 const end=controller.indexOf('if(!port.playback.startIncident',start);
 const segment=controller.slice(start,end);
 assert.ok(segment.indexOf("port.chooseCamera('director')")<
   segment.indexOf('if(!port.startBodycam())'));
});
