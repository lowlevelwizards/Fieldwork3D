import test from 'node:test';
import assert from 'node:assert/strict';
import {QueueMotionAudit,listenQueueMotion,noteQueueMotion}
 from '../src/breach-queue-trace.ts';
test('Q0 attribution is opt-in, source-labelled and bounded',()=>{
 const s={seconds:0,operators:[{id:'a',side:'blue',health:4,
  p:{x:20,y:35},motorPause:'passage',lastBlocker:'clear',velocity:0}],
  doors:[{id:'D',a:{x:0,y:0},b:{x:40,y:0}}]};
 const q=new QueueMotionAudit(),slots=new Map([['a',[{doorId:'D',fromSide:1,rank:0}]]]);
 listenQueueMotion(s,e=>q.event(e));
 noteQueueMotion(s,s.operators[0],'opening-leaf-yield',{x:20,y:35},{x:20,y:36});
 for(let i=0;i<12;i++){s.seconds+=1/60;q.sample(s,slots);}
 assert.equal(q.report().sources['opening-leaf-yield'],1);
 assert.equal(q.report().samples,2);
 assert.equal(q.report().waitingBackward,0);
 s.operators[0].p={x:20,y:40};
 for(let i=0;i<6;i++){s.seconds+=1/60;q.sample(s,slots);}
 assert.equal(q.report().waitingBackward,5);
 listenQueueMotion(s,null);
 q.reset();
 assert.equal(q.report().samples,0);
});