import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterReplayTimeline} from '../src/breach-replay-timeline-markers.ts';
test('hundreds of dense events occupy a bounded number of visible ticks',()=>{
  const source=Array.from({length:500},(_,i)=>({
    t:i/500*60,kind:i%11===0?'shot':'door'
  }));
  const clusters=clusterReplayTimeline(source,60,350);
  assert.ok(clusters.length<=50);
  assert.equal(clusters.reduce((n,c)=>n+c.count,0),500);
  assert.ok(clusters.every(c=>c.index>=0&&c.index<50));
  assert.ok(clusters.some(c=>c.count>1));
});
test('most consequential marker category wins a cluster without hiding evidence',()=>{
  const events=[
    {t:1,kind:'shot'},{t:1.01,kind:'door'},
    {t:1.02,kind:'wound'},{t:1.03,kind:'down'}
  ];
  const clusters=clusterReplayTimeline(events,60,300);
  assert.equal(clusters.length,1);
  assert.equal(clusters[0].kind,'down');
  assert.equal(clusters[0].count,4);
  assert.deepEqual(clusterReplayTimeline(events,0,300),[]);
});
