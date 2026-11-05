import test from 'node:test';
import assert from 'node:assert/strict';
import {linear8ToSrgb8,THUMB_LINEAR_TO_SRGB}
 from '../src/operator-thumbnail-color.ts';
test('R15 facewear thumbnail renders convert linear RGB back to sRGB',()=>{
 assert.equal(linear8ToSrgb8(0),0);
 assert.equal(linear8ToSrgb8(255),255);
 assert.ok(Math.abs(linear8ToSrgb8(14)-67)<=2,
  'render-target dark green should display as readable card backdrop');
 assert.ok(THUMB_LINEAR_TO_SRGB[24]>24,
  'very dark gas mask faces lift in appearance grid without modifying model material');
 for(let i=1;i<256;i++)
  assert.ok(THUMB_LINEAR_TO_SRGB[i]>=THUMB_LINEAR_TO_SRGB[i-1]);
});
