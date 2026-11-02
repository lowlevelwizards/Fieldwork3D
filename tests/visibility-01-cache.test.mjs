import test from 'node:test';
import assert from 'node:assert/strict';
import {fogFingerprint} from '../src/breach-fog-cache.ts';
const state=()=>({mode:'exterior-known',seed:42,seenCount:31,revision:0,
 actors:[{id:'rook',x:100,y:100,heading:0,posture:'stand',health:2}],
 doors:[{id:'entry',fraction:0}]});
test('VIS-01 fingerprint is stable for unchanged observations',()=>{
 assert.equal(fogFingerprint(state()),fogFingerprint(state()));
});
test('VIS-01 mode and site changes invalidate identical-count fog',()=>{
 const a=state();
 assert.notEqual(fogFingerprint(a),fogFingerprint({...a,mode:'floor-plan'}));
 assert.notEqual(fogFingerprint(a),fogFingerprint({...a,seed:43}));
});
test('VIS-01 doors, pose, and exploration invalidate cached mask',()=>{
 const a=state();
 assert.notEqual(fogFingerprint(a),fogFingerprint({...a,seenCount:32}));
 assert.notEqual(fogFingerprint(a),fogFingerprint({...a,revision:1}));
 assert.notEqual(fogFingerprint(a),fogFingerprint({...a,doors:[{id:'entry',fraction:.5}]}));
 assert.notEqual(fogFingerprint(a),fogFingerprint({...a,actors:[{...a.actors[0],heading:1}]}));
});
