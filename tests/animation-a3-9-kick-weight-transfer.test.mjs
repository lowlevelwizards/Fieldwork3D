import test from 'node:test';
import assert from 'node:assert/strict';
import {kickMotion,KICK_DURATION} from '../src/breach-door-actions.ts';
import {kickFootChoice} from '../src/breach-kick-foot-choice.ts';

test('A3.9-K support-leg bracing precedes the actual kick impact',()=>{
 const start=kickMotion(0),windup=kickMotion(KICK_DURATION*.30);
 const hit=kickMotion(KICK_DURATION*.53),settle=kickMotion(KICK_DURATION);
 assert.equal(start.brace,0);
 assert.ok(windup.brace>0);
 assert.equal(hit.contact,true);
 assert.ok(hit.brace>.75,'impact supported by planted opposite leg');
 assert.ok(settle.brace<.01,'weight returns after replant');
 assert.equal(settle.extension,0);
 assert.equal(settle.complete,true);
});
test('A3.9-K both anatomical legs can carry the identical physical impact',()=>{
 const place={x:0,y:0};
 assert.equal(kickFootChoice(place,0,{x:14,y:-7},()=>true),0);
 assert.equal(kickFootChoice(place,0,{x:14,y:7},()=>true),1);
 // No legal planted support foot means no selected visual leg.
 assert.equal(kickFootChoice(place,0,{x:14,y:7},
   (_index,_from,_support,_point)=>false),null);
});
test('A3.9-K frame and kick result are deterministic at identical simulation age',()=>{
 const samples=[.10,.33,.53,.63,.75,1].map(v=>
   kickMotion(KICK_DURATION*v));
 assert.deepEqual(samples,[.10,.33,.53,.63,.75,1].map(v=>
   kickMotion(KICK_DURATION*v)));
 assert.ok(samples.every(c=>c.brace>=0&&c.brace<=1.25&&
   c.extension>=0&&c.extension<=1&&c.recover>=0&&c.recover<=1));
});
