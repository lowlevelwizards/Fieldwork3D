import test from 'node:test';
import assert from 'node:assert/strict';
import {focusZoomMultiplier,FOCUS_PROTECTION,
 recentRevealWeight,attentionRelease,focusFogBoundaryGuard}
 from '../src/rendering/miniature-attention-policy.ts';
test('wide diorama vs tight room focus intensity',()=>{
 assert.equal(focusZoomMultiplier(1,0),1);
 assert.ok(focusZoomMultiplier(1.65,0)<.7);
 assert.ok(focusZoomMultiplier(2.5,0)<=.14+.0001);
 assert.ok(focusZoomMultiplier(1,.75)<=.14+.0001);
 assert.equal(focusZoomMultiplier(Number.NaN,0),0);
});
test('priority: confirmed sight/critical protected; past context free to blur',()=>{
 assert.equal(FOCUS_PROTECTION.critical,1);
 assert.equal(FOCUS_PROTECTION.sight,1);
 assert.ok(FOCUS_PROTECTION.recent>.9);
 assert.equal(FOCUS_PROTECTION.background,0);
});
test('new revelation survives 2.4 seconds and releases without a step',()=>{
 assert.equal(recentRevealWeight(0),1);
 assert.equal(recentRevealWeight(2.4),1);
 assert.ok(recentRevealWeight(3)>0&&recentRevealWeight(3)<1);
 assert.equal(recentRevealWeight(3.7),0);
});
test('new sight instantly clears blur; past focus fades over multiple ticks',()=>{
 assert.equal(attentionRelease(0,1,.016),1);
 const after=attentionRelease(1,0,.1);
 assert.ok(after>.6&&after<1);
 assert.ok(attentionRelease(after,0,.1)<after);
 assert.equal(attentionRelease(1,0,0),1);
});
test('opaque fog/architecture contrast blocks bleed',()=>{
 assert.equal(focusFogBoundaryGuard(0),1);
 assert.equal(focusFogBoundaryGuard(.5),0);
});
