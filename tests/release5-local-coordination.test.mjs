import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupResponse} from '../src/breach-ai-coordination.ts';
import {reportToListener} from '../src/breach-communication.ts';
const p=(x,y)=>({x,y});
test('R5.2 uncertain auditory report is a physically limited observation',()=>{
 const report={id:501,senderId:'red-A',at:1,origin:p(0,0),
   estimate:p(37,22),uncertainty:65,source:'auditory',
   sourceEventId:411,deliveredTo:[]};
 assert.equal(reportToListener(report,'red-A',p(8,0),[],[],1.2),null);
 assert.equal(reportToListener(report,'red-B',p(900,0),[],[],1.2),null);
 const listener=reportToListener(report,'red-B',p(30,0),[],[],1.2);
 assert.ok(listener,'nearby listener receives spoken alert');
 assert.deepEqual(listener.estimate,report.estimate);
 assert.ok(listener.uncertainty>report.uncertainty);
 assert.equal(listener.source,'reported','no direct sight is granted');
});
test('R5.2 an alarm reporter investigates while new listeners cover',()=>{
 const estimate=p(100,0),actors=[
  {id:'reporter',p:p(20,0)},{id:'recipient1',p:p(70,0)},
  {id:'recipient2',p:p(115,0)}];
 const roles=groupResponse(actors,estimate,{reporter:'investigate'});
 assert.equal(roles.reporter,'investigate');
 assert.equal(roles.recipient2,'watch','nearest receives watch duty');
 assert.equal(roles.recipient1,'support','remaining provides support');
 assert.deepEqual(groupResponse([...actors].reverse(),estimate,roles),roles);
});
test('R5.2 runtime warnings originate in fresh local evidence and deduplicate',()=>{
 const source=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(source,/noiseDisposition==='alarm'&&a\.encounterGroupId/);
 assert.match(source,/sourceEventId===strongest\.id/);
 assert.match(source,/source:'auditory',sourceEventId:strongest\.id/);
 assert.match(source,/reporter\?\{\[reporter\.id\]:'investigate' as const\}/);
});
