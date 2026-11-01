import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretSound} from '../src/breach-sound-evidence.ts';
test('separate listeners hear different plausible estimates, closed doors muffle',()=>{
 const e={id:17,p:{x:20,y:20},radius:400,time:2,kind:'gunshot'};
 const a=interpretSound(e,'A',{x:100,y:100},[],[]);
 const b=interpretSound(e,'B',{x:100,y:100},[],[]);
 assert.ok(a&&b);
 assert.notDeepEqual(a.estimate,b.estimate);
 assert.deepEqual(a,interpretSound(e,'A',{x:100,y:100},[],[]));
 assert.ok(a.uncertainty>=24);
 const muted=interpretSound(e,'A',{x:100,y:100},[
 {id:'D',a:{x:50,y:0},b:{x:50,y:140},open:false,openedAt:0}],[]);
 assert.ok(muted===null||muted.intensity<a.intensity);
});
