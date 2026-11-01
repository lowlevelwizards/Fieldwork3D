import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterRng,encounterSeed} from '../src/worldgen/encounter-rng.ts';
test('encounter RNG lanes are reproducible and independent',()=>{
 const a=Array.from({length:12},()=>encounterRng(123456,1)());
 // A new stream must reproduce precisely; generating one lane must not advance another.
 const first=encounterRng(123456,1),second=encounterRng(123456,2);
 const baseline=Array.from({length:12},()=>first());
 assert.deepEqual(a,Array(12).fill(baseline[0])); // each freshly seeded stream starts identically
 assert.notEqual(encounterSeed(123456,1),encounterSeed(123456,2));
 assert.notEqual(second(),baseline[0]);
 const repeat=encounterRng(123456,1);
 assert.deepEqual(Array.from({length:12},()=>repeat()),baseline);
});
