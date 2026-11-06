import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReplayDirectorCues,replayCameraTarget,easeReplayCamera}
  from '../src/breach-replay-director.ts';
const squad=[
  {id:'rook',side:'blue',health:4,p:{x:100,y:100}},
  {id:'moss',side:'blue',health:4,p:{x:150,y:100}},
  {id:'guard0',side:'red',health:2,p:{x:400,y:500}}
];
test('director cues coalesce volleys but favor significant impacts',()=>{
 const events=[
  {t:2,kind:'shot',p:{x:200,y:200}},
  {t:3,kind:'wound',p:{x:220,y:200}},
  {t:20,kind:'door',p:{x:320,y:200}}
 ];
 const cues=buildReplayDirectorCues(events);
 assert.equal(cues.length,2);
 assert.equal(cues[0].kind,'wound');
 assert.equal(cues[0].t,2);
 assert.equal(cues[1].t,20);
});
test('director uses only disclosed events, with stable seeking and fallback',()=>{
 const cues=buildReplayDirectorCues([{t:2,kind:'down',p:{x:275,y:275}}]);
 const target=replayCameraTarget('director',3,squad,'rook',1,cues);
 assert.deepEqual(target.focus,{x:275,y:275});
 assert.deepEqual(replayCameraTarget('director',3,squad,'rook',1,cues),target);
 const fallback=replayCameraTarget('director',10,squad,'rook',1,cues);
 assert.deepEqual(fallback.focus,{x:125,y:100});
 assert.deepEqual(replayCameraTarget('director',3,squad,'rook',1,[]).focus,
  fallback.focus,'No unseen events may influence camera framing');
 assert.equal(replayCameraTarget('free',3,squad,'rook',1,cues),null);
});
test('operator tracking excludes dead actors and easing is stable',()=>{
 const cues=[];
 const target=replayCameraTarget('operator',0,squad,'rook',.46,cues);
 assert.deepEqual(target.focus,{x:100,y:100});
 const eased=easeReplayCamera({
  focus:{x:0,y:0},zoom:1,kind:'squad'},target,1/60);
 assert.ok(eased.focus.x>0&&eased.focus.x<100);
 assert.deepEqual(easeReplayCamera(eased,target,0,true),target);
 assert.equal(replayCameraTarget('operator',0,
  [{id:'rook',side:'blue',health:0,p:{x:100,y:100}}],'rook',1,[]),null);
});
