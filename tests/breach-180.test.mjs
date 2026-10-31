import test from 'node:test';
import assert from 'node:assert/strict';
import {legReachTruth} from '../src/breach-animation-diagnostics.ts';

test('180: vertical separation consumes horizontal reach budget',()=>{
  const a=legReachTruth({hip:{x:0,y:20.2,z:4.8},
    ankle:{x:0,y:1.45,z:5.6},upper:9.7,lower:9.7});
  assert.ok(a.reachable);
  assert.ok(a.horizontalMaximum<6);
  const b=legReachTruth({hip:{x:0,y:20.2,z:4.8},
    ankle:{x:10,y:1.45,z:5.6},upper:9.7,lower:9.7});
  assert.ok(!b.reachable);
  assert.ok(b.reachError>0);
});
test('180: diagnostic never changes passed geometry',()=>{
  const hip={x:0,y:2,z:0},ankle={x:100,y:0,z:0};
  legReachTruth({hip,ankle,upper:10,lower:10});
  assert.equal(hip.y,2);assert.equal(ankle.x,100);
});
