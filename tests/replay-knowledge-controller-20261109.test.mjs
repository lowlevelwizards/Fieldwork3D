import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayKnowledgeController} from '../src/breach-replay-knowledge-controller.ts';
test('replay disclosure uses only the recorded observer mode',()=>{
 const data=new ReplayKnowledgeController();
 assert.deepEqual(data.disclosure(),{mode:'full'});
 data.omniscient=false;
 assert.deepEqual(data.disclosure(),{mode:'squad'});
 data.observerId='rook';
 assert.deepEqual(data.disclosure(),{mode:'operator',observerId:'rook'});
 data.reset();
 assert.deepEqual(data.disclosure(),{mode:'full'});
});
test('archived replay knowledge remains unavailable without recorded evidence',()=>{
 const data=new ReplayKnowledgeController();
 data.prepare({frames:[],doorKnowledge:{observations:[]},
  windowKnowledge:{observations:[]},personalGround:[]});
 assert.equal(data.hasContactEvidence,false);
 assert.equal(data.sightIndex,null);
 assert.equal(data.doorHistory,null);
 assert.equal(data.personalGround,null);
});
