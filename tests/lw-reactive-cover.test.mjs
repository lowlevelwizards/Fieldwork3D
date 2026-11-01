import test from 'node:test';import assert from 'node:assert/strict';
import {damageCover} from '../src/breach-reactive-cover.ts';
test('damaged wood becomes physically reduced debris without deleting index',()=>{
 const o={x:0,y:0,w:60,h:40,low:false,fixture:'desk',material:'hardwood',integrity:1.8};
 assert.equal(damageCover(o,.6),'damaged');
 assert.equal(o.w,60);
 assert.equal(damageCover(o,5),'collapsed');
 assert.equal(o.destroyed,true);assert.equal(o.low,true);
 assert.ok(o.w<60&&o.h<40);
 assert.equal(damageCover(o,2),'immune');
});
test('critical structural cover remains intact',()=>{
 const o={x:0,y:0,w:120,h:60,fixture:'vehicle',material:'sheet-metal'};
 assert.equal(damageCover(o,20),'immune');
 assert.equal(o.destroyed,undefined);
});
