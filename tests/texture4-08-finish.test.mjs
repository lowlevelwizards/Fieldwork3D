import test from 'node:test';import assert from 'node:assert/strict';
import {wearFinish} from '../src/rendering/wear-finish.ts';
test('oil is smoother than dry material, rust remains matte',()=>{
 assert.ok(wearFinish('concrete','oil').roughness<wearFinish('concrete','dust').roughness);
 assert.ok(wearFinish('painted-metal','rust').roughness>=.95);
 assert.ok(wearFinish('painted-metal','chip').metalness>0);
 assert.equal(wearFinish('wood','chip').metalness,0);
});
