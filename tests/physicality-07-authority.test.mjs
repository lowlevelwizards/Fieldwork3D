import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';
const p=(id,side,from,to)=>({id,side,from,to,alive:true});
test('opposing actors cannot move through a stationary guard',()=>{
 const actors=[p('blue','blue',{x:0,y:0},{x:8,y:0}),
  p('guard','red',{x:16,y:0},{x:16,y:0})];
 const out=resolveMovementFrame(actors,()=>true);
 assert.equal(out[0].blocked,'actor');
 assert.deepEqual(out[0].point,{x:0,y:0});
 assert.deepEqual(out[1].point,{x:16,y:0});
});
test('friendlies can pass softly without forcing the held teammate to move',()=>{
 const actors=[p('blue','blue',{x:0,y:0},{x:9,y:0}),
  p('held','blue',{x:16,y:0},{x:16,y:0})];
 const out=resolveMovementFrame(actors,()=>true);
 assert.equal(out[0].blocked,null);
 assert.deepEqual(out[0].point,{x:9,y:0});
 assert.deepEqual(out[1].point,{x:16,y:0});
});
test('hard geometry vetoes any actor proposal before contact decisions',()=>{
 const actors=[p('blue','blue',{x:0,y:0},{x:7,y:0})];
 assert.deepEqual(resolveMovementFrame(actors,()=>false)[0],
  {id:'blue',point:{x:0,y:0},blocked:'geometry'});
});
test('opposing simultaneous crossing is deterministic regardless of input order',()=>{
 const a=p('alpha','blue',{x:0,y:0},{x:9,y:0});
 const b=p('bravo','red',{x:16,y:0},{x:7,y:0});
 const forward=resolveMovementFrame([a,b],()=>true);
 const backward=resolveMovementFrame([b,a],()=>true);
 assert.deepEqual(Object.fromEntries(forward.map(x=>[x.id,x])),
   Object.fromEntries(backward.map(x=>[x.id,x])));
 assert.equal(forward.find(x=>x.id==='bravo').blocked,'actor');
});
