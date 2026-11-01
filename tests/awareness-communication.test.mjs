import test from 'node:test';import assert from 'node:assert/strict';
import {reportToListener} from '../src/breach-communication.ts';
const r={id:3,senderId:'A',at:1,origin:{x:30,y:30},
 estimate:{x:100,y:80},uncertainty:35,deliveredTo:[]};
test('speech is range-gated, secondhand, and not sent to the speaker',()=>{
 assert.equal(reportToListener(r,'A',{x:50,y:30},[],[],1),null);
 const heard=reportToListener(r,'B',{x:60,y:30},[],[],1);
 assert.ok(heard);assert.equal(heard.source,'reported');
 assert.ok(heard.uncertainty>=35);
 assert.equal(reportToListener(r,'C',{x:600,y:30},[],[],1),null);
 assert.equal(reportToListener(r,'B',{x:60,y:30},[],[],3),null);
});
