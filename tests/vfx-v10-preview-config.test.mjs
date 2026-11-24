import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVfxPreview} from '../src/rendering/breach-vfx-preview-config.ts';
test('V10 default off; suite coarse grass and non-lighting experiments',()=>{
 const off=resolveVfxPreview(new URLSearchParams());
 for(const k of ['suite','grass','bush','blood','impacts','glass','smoke','evidence','lights'])assert.equal(off[k],false);
 const on=resolveVfxPreview(new URLSearchParams('vfxSuite=1'));
 for(const k of ['suite','grass','bush','blood','impacts','glass','smoke','evidence'])assert.equal(on[k],true);
 assert.equal(on.grassCell,192);assert.equal(on.lights,false);
 const custom=resolveVfxPreview(new URLSearchParams('vfxSuite=1&vfxGrass=0&vfxImpacts=0&vfxBlood=0&vfxLights=1&vfxGrassCell=96'));
 assert.equal(custom.grass,false);assert.equal(custom.blood,false);assert.equal(custom.impacts,false);
 assert.equal(custom.lights,true);assert.equal(custom.grassCell,96);
 assert.equal(resolveVfxPreview(new URLSearchParams('vfxGrass=1')).grassCell,96);
});
