import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot,MissionRecorder} from '../src/breach-replay.ts';
import {REPLAY_FULL_KEYFRAME_INTERVAL} from '../src/breach-replay-sharing.ts';

const fields=['doors','shots','casings','dropped','impactMarks','grenades',
 'flashBursts','civilianHarmEvents'];
function addEvents(s){
 s.shots.push({id:100,start:{x:11,y:13},end:{x:50,y:73},age:.02,
  duration:.3,kind:'bullet'});
 s.casings.push({id:12,p:{x:7,y:8},age:.2});
 s.dropped.push({id:'mag-1',p:{x:3,y:9},rounds:10});
 s.impactMarks.push({id:21,p:{x:2,y:5},age:.2});
 s.grenades.push({id:30,p:{x:8,y:9},from:{x:7,y:8},
  to:{x:10,y:11},age:.3});
 s.flashBursts.push({id:4,p:{x:7,y:8},age:.1});
 s.civilianHarmEvents.push({id:1,shotId:3,at:0,actorId:'rook',
  victimId:'civ',sourceSide:'blue',before:100,after:90,
  severity:'injured',p:{x:10,y:20}});
}
test('E5.1 unchanged live doors and all effect evidence bypass deep cloning',()=>{
 const s=newSession(0),first=snapshot(s);addEvents(s);
 const recorded=snapshot(s);
 const result=snapshot(s,undefined,undefined,new Set(),new Map(),
   undefined,recorded);
 const reference=snapshot(s);
 assert.deepEqual(result,reference,'capture-side fast path must preserve all evidence');
 for(const key of fields)
  assert.strictEqual(result[key],recorded[key],
   key+' should be reused before allocating a second immutable copy');
 assert.notStrictEqual(first.doors,recorded.doors);
});
test('E5.1 in-place mutations do not rewrite the prior film or falsely share evidence',()=>{
 const s=newSession(0);addEvents(s);
 const prior=snapshot(s);
 const priorCopy=structuredClone(prior);
 s.doors[0].open=!s.doors[0].open;
 s.shots[0].start.x+=19;
 s.casings[0].age+=2;
 s.dropped[0].p.x+=1;
 s.impactMarks[0].p.y+=2;
 s.grenades[0].from.x+=4;
 s.flashBursts[0].p.x+=3;
 s.civilianHarmEvents[0].p.x+=2;
 const newer=snapshot(s,undefined,undefined,new Set(),new Map(),
   undefined,prior);
 const reference=snapshot(s);
 for(const key of fields){
  assert.notStrictEqual(newer[key],prior[key],
   key+' must be owned by new film after source mutation');
  assert.deepEqual(newer[key],reference[key]);
 }
 assert.deepEqual(prior,priorCopy,
  'source mutation and later captures must not change prior archive facts');
 s.shots[0].start.x+=7;
 assert.notEqual(newer.shots[0].start.x,s.shots[0].start.x);
});
test('E5.1 empty arrays share but forced/keyframe snapshots remain independent',()=>{
 const s=newSession(0),rec=new MissionRecorder();
 rec.capture(s,true);
 for(let i=1;i<=REPLAY_FULL_KEYFRAME_INTERVAL;i++){
  s.seconds=i*.051;
  rec.capture(s);
 }
 assert.equal(rec.frames.length,REPLAY_FULL_KEYFRAME_INTERVAL+1);
 const first=rec.frames[0],second=rec.frames[1];
 for(const key of fields)
  assert.strictEqual(second[key],first[key],
   key+' non-keyframes should use prior film references');
 const keyframe=rec.frames[REPLAY_FULL_KEYFRAME_INTERVAL];
 for(const key of fields)
  assert.notStrictEqual(keyframe[key],rec.frames.at(-2)[key],
   key+' keyframes must own their complete independent evidence');
 const untouched=rec.frames[0].shots;
 s.seconds+=.051;
 rec.capture(s,true);
 assert.strictEqual(rec.frames[0].shots,untouched);
 assert.equal(rec.completeness.complete,true);
});
test('E5.1 a changed transient array never shares while stable siblings do',()=>{
 const s=newSession(0);addEvents(s);
 const first=snapshot(s);
 s.casings.push({id:300,p:{x:31,y:13},age:.1});
 const second=snapshot(s,undefined,undefined,new Set(),new Map(),
  undefined,first);
 assert.notStrictEqual(second.casings,first.casings);
 for(const key of fields.filter(key=>key!=='casings'))
  assert.strictEqual(second[key],first[key],key);
 assert.equal(first.casings.length,1);
 assert.equal(second.casings.length,2);
});
