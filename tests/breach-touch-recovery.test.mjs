import test from 'node:test';
import assert from 'node:assert/strict';
import {matchActiveTouchPointers} from '../src/breach-touch-recovery.ts';

test('one surviving contact drops an orphaned second pinch pointer',()=>{
  const pointers=new Map([[41,{x:100,y:100}],[77,{x:250,y:100}]]);
  assert.deepEqual([...matchActiveTouchPointers(pointers,[{x:253,y:101}])],[77]);
});
test('a new finger supersedes a ghost from the prior gesture',()=>{
  const pointers=new Map([[18,{x:100,y:100}],[92,{x:310,y:440}]]);
  assert.deepEqual([...matchActiveTouchPointers(pointers,[{x:309,y:441}])],[92]);
});
test('two real fingers stay in multi-contact pan and pinch',()=>{
  const pointers=new Map([[5,{x:100,y:150}],[6,{x:220,y:150}]]);
  assert.deepEqual([...matchActiveTouchPointers(pointers,
    [{x:99,y:151},{x:221,y:149}])].sort(),[5,6]);
});
test('a lifted final contact leaves no ghost pointers',()=>{
  const pointers=new Map([[8,{x:120,y:180}],[9,{x:240,y:180}]]);
  assert.equal(matchActiveTouchPointers(pointers,[]).size,0);
});
