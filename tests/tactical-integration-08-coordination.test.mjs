import test from 'node:test';
import assert from 'node:assert/strict';
import {groupResponse} from '../src/breach-ai-coordination.ts';
import {reportToListener} from '../src/breach-communication.ts';

const listeners=[
 {id:'B',p:{x:25,y:0}},
 {id:'C',p:{x:90,y:0}},
 {id:'D',p:{x:115,y:0}},
 {id:'E',p:{x:140,y:0}}
];
const estimated={x:0,y:0};

test('local roles separate investigator, watcher and supporter',()=>{
 const roles=groupResponse(listeners,estimated);
 assert.deepEqual(roles,{B:'investigate',C:'watch',D:'support',E:'watch'});
 assert.deepEqual(roles,groupResponse([...listeners].reverse(),estimated),
  'input iteration order cannot change local assignment');
});

test('late informed allies do not steal previously committed duties',()=>{
 const early=groupResponse(listeners.slice(1,3),estimated);
 assert.deepEqual(early,{C:'investigate',D:'watch'});
 const final=groupResponse(listeners,estimated,early);
 assert.equal(final.C,'investigate','first investigator retains assignment');
 assert.equal(final.D,'watch');
 assert.equal(final.B,'support');
 assert.equal(final.E,'watch');
});

test('unheard report cannot supply any coordinated role or target',()=>{
 const report={id:4,senderId:'A',at:1,origin:{x:0,y:0},
  estimate:estimated,uncertainty:100,deliveredTo:[]};
 const far=reportToListener(report,'B',{x:999,y:0},[],[],1.3);
 assert.equal(far,null);
 assert.deepEqual(groupResponse([],estimated),{});
});
