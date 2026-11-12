import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesTimelineFilter,clusterAfterActionTimeline,TIMELINE_FILTERS}
 from '../src/breach-after-action-timeline.ts';
test('V5.4 event filters account for Other without deleting any evidence',()=>{
 const items=[{key:'a',t:0,priority:1,category:'other'},
  {key:'b',t:5,priority:9,category:'casualty'},
  {key:'c',t:10,priority:7,category:'contact'}];
 assert.ok(TIMELINE_FILTERS.includes('other'));
 assert.ok(TIMELINE_FILTERS.includes('key'));
 assert.equal(items.filter(e=>matchesTimelineFilter(e,'all')).length,3);
 assert.equal(items.filter(e=>matchesTimelineFilter(e,'key')).length,2);
 assert.equal(items.filter(e=>matchesTimelineFilter(e,'other')).length,1);
});
test('V5.4 cluster markers use authentic timestamps, not decorative bin centers',()=>{
 const items=[{key:'first',t:0,priority:7,category:'contact',
  kind:'intel',text:'SPOTTED',source:'battle',order:0},
  {key:'last',t:49,priority:10,category:'objective',
   kind:'objective',text:'SECURED',source:'battle',order:1}];
 const clustered=clusterAfterActionTimeline(items,49,480,'all');
 assert.equal(clustered[0].time,0);
 assert.equal(clustered.at(-1).time,49);
 assert.equal(clustered.reduce((n,c)=>n+c.events.length,0),2);
});
