import test from 'node:test';
import assert from 'node:assert/strict';
import {coverImpactFraction,coverHeight,eyeHeight,aimHeight}
  from '../src/breach-cover-height.ts';
const from={x:0,y:50},to={x:100,y:50};
const low={x:88,y:50,w:14,h:28,low:true};
const high={...low,low:false};
test('143B: standing shot clears low cover while crouched target stays concealed',()=>{
  assert.equal(coverImpactFraction(from,to,22,aimHeight(false),low),null);
  assert.ok(coverImpactFraction(from,to,22,aimHeight(true),low)!==null);
  assert.equal(coverHeight(low),12);
  assert.equal(eyeHeight(false),32);
});
test('143B: tall cover blocks low trajectories but not sight over the top',()=>{
  assert.ok(coverImpactFraction(from,to,22,20,high)!==null);
  assert.equal(coverImpactFraction(from,to,32,32,high),null);
  assert.equal(coverHeight(high),27);
});
test('143B: grazing a corner does not magically block elevated fire',()=>{
  assert.equal(coverImpactFraction({x:0,y:0},{x:100,y:0},
    18,18,low),null);
});