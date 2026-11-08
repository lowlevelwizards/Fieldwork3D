import test from 'node:test';
import assert from 'node:assert/strict';
import {directorCompositionQuality}
  from '../src/breach-replay-director-projection.ts';
import {buildDirectorTempoEdits,directorTempoJump}
  from '../src/breach-replay-director-tempo.ts';

const p=(x,y)=>({x,y});
const metrics=(anchor,focus,operator,target,kind='engage')=>
 directorCompositionQuality(anchor,focus,operator,target,
  p(1,0),kind,'ortho',.9,1100,1.3,108,.88,.84);

test('R9 composition returns finite and bounded photographic metrics',()=>{
 const a=metrics(p(35,50),p(165,90),p(90,80),p(155,80));
 for(const key of ['score','targetOverlap','thirdsError',
  'leadError','headroomError'])
  assert.ok(Number.isFinite(a[key]),key+' must be finite');
 assert.ok(a.targetOverlap>=0&&a.targetOverlap<=1);
 assert.ok([-1,0,1].includes(a.shoulderSide));
});

test('R9 OTS rejects a projected target obscured directly behind operator',()=>{
 const behind=metrics(p(30,80),p(150,80),p(90,80),p(150,80));
 const offset=metrics(p(35,36),p(150,80),p(90,80),p(150,80));
 assert.ok(behind.targetOverlap>=offset.targetOverlap,
  'lateral view should improve projected target separation');
 if(behind.targetOverlap>.3)assert.equal(behind.targetReadable,false);
});

const frame=(t,movePeer=false,moveCivilian=false,working=false)=>({
 t,
 actors:[{id:'rook',p:p(50,50),health:4,velocity:0,
  reload:working,traversal:null,treatmentActive:false,
  plan:[{id:3,kind:'move',p:p(150,50)}]},
  {id:'ash',p:p(75+(movePeer?t*2:0),75),health:4,
   plan:[],velocity:movePeer?2:0}],
 civilians:[{id:'civilian',p:p(85+(moveCivilian?t*2:0),85)}]
});
const frames=(opts={})=>Array.from({length:241},(_,i)=>
 frame(i*.05,opts.movePeer,opts.moveCivilian,opts.working));
const events=[
 {id:1,t:1,actor:'rook',orderId:3,kind:'blocked',
  reason:'collision-furniture',p:p(50,50),text:'BLOCKED'},
 {id:2,t:9,actor:'rook',orderId:3,kind:'resumed',
  reason:'move',p:p(50,50),text:'RESUMED'}
];
const friends=new Set(['rook','ash']);
const detect=(f=frames(),ev=events,battle=[])=>
 buildDirectorTempoEdits(f,ev,battle,friends);

test('R9 trims only resolved, long, genuinely unproductive navigation',()=>{
 const edits=detect();
 assert.equal(edits.length,1);
 assert.ok(edits[0].sourceStart>1&&edits[0].sourceEnd<9);
 assert.ok(edits[0].sourceEnd-edits[0].sourceStart>2);
 assert.equal(directorTempoJump(edits,1.9,2.1)?.kind,
  'confirmed-obstruction');
 assert.equal(directorTempoJump(edits,3,3.1),null,
  'manual seek into the interval must not jump');
});

test('R9 will not edit unrecovered, intentional or short holds',()=>{
 assert.equal(detect(frames(),events.slice(0,1)).length,0);
 assert.equal(detect(frames(),[
  {...events[0],kind:'waiting',reason:'wait'},events[1]
 ]).length,0);
 assert.equal(detect(frames(),[
  {...events[0],t:4.5},{...events[1],t:7}
 ]).length,0);
});

test('R9 other moving actors, civilians, actions and firefights veto trim',()=>{
 assert.equal(detect(frames({movePeer:true})).length,0);
 assert.equal(detect(frames({moveCivilian:true})).length,0);
 assert.equal(detect(frames({working:true})).length,0);
 assert.equal(detect(frames(),events,[{t:5}]).length,0);
});
