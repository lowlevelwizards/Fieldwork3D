import test from 'node:test';
import assert from 'node:assert/strict';
import {ImpactMarkSlotCache,MARK_MATRIX_DIRTY as M,MARK_COLOR_DIRTY as C,MARK_STYLE_DIRTY as S} from '../src/rendering/breach-impact-mark-cache.ts';
test('V9 persistent evidence transforms, color aging and style uploads independently',()=>{
 const cache=new ImpactMarkSlotCache(64);
 assert.equal(cache.update(0,1,.85,3,4,0x763c38,1,2),M|C|S);
 assert.equal(cache.update(0,1,.85,3,4,0x763c38,1,2),0);
 assert.equal(cache.update(0,1,.85,3,4,0x763c38,.9,2),C);
 assert.equal(cache.update(0,1,.85,3,4,0x763c38,.9,3),S);
 assert.equal(cache.update(0,4,.85,3,4,0x763c38,.9,3),M);
 // Rewind and refreshed blood age change only the color lane.
 assert.equal(cache.update(0,4,.85,3,4,0x763c38,1,3),C);
 cache.reset();assert.equal(cache.update(0,4,.85,3,4,0x763c38,1,3),M|C|S);
});
test('V9 re-compacted visible slots never inherit prior mark transforms',()=>{
 const c=new ImpactMarkSlotCache(2);
 c.update(0,1,2,3,4,1,1,0);c.update(1,9,2,3,4,2,.5,2);
 assert.equal(c.update(0,9,2,3,4,2,.5,2),M|C|S);
 assert.equal(c.update(2,1,2,3,4,1,1,0),0);
});
