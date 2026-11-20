import test from 'node:test';
import assert from 'node:assert/strict';
import {MovementQualitySurvey} from '../src/breach-movement-quality.ts';
const p=(x,y)=>({x,y});
const actor=()=>({id:'rook',p:p(0,0),plan:[{id:1,kind:'move',p:p(10,0)}],
 recoveryAttempts:0,blockedTime:0,motorPause:null,squeeze:false,orderIssue:null});
test('M1: physical backtracking and reversals, not route transitions',()=>{
 const a=actor(),s=new MovementQualitySurvey([a],new Map([[a.id,p(10,0)]]));
 a.p=p(3,0);s.sample([a],1/60);
 a.p=p(1,0);s.sample([a],1/60);
 const x=s.finish([a]);assert.equal(x.details[0].distance,5);
 assert.equal(x.backtrackDistance,2);assert.equal(x.reversals,1);
 assert.equal(x.details[0].routeStretch,null);
});
test('M1: real stationary time counts only with attempted goal',()=>{
 const a=actor(),s=new MovementQualitySurvey([a],new Map([[a.id,p(10,0)]]));
 for(let i=0;i<120;i++)s.sample([a],1/60);
 assert.ok(s.finish([a]).longestNoProgressSeconds>=1.99);
 a.plan=[];s.sample([a],1/60);
 assert.ok(s.finish([a]).longestNoProgressSeconds>=1.99);
});
test('M1: physical arrivals may report actual route stretch',()=>{
 const a=actor(),s=new MovementQualitySurvey([a],new Map([[a.id,p(50,0)]]));
 a.p=p(50,0);s.sample([a],1/60);
 assert.equal(s.finish([a]).details[0].routeStretch,1);
});
