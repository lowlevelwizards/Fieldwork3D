import test from 'node:test';import assert from 'node:assert/strict';
import {conditionColor,conditionRoughness} from '../src/worldgen/asset-condition.ts';
test('clean remains unchanged and aging is material-aware',()=>{
 const c=0x879b8b;
 assert.equal(conditionColor(c,'fabric','clean'),c);
 assert.notEqual(conditionColor(c,'fabric','vacant'),conditionColor(c,'porcelain','vacant'));
 assert.ok(conditionRoughness(.7,'metal','neglected')>.7);
 assert.equal(conditionColor(c,'wood','used'),conditionColor(c,'wood','used'));
});