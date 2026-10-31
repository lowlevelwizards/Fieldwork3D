import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('190c: unused dummy groups and stride counter are retired',()=>{
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.doesNotMatch(rig,/legacyLegs|legacyArms|stridePhase/);
 assert.doesNotMatch(scene,/legacyLegs|legacyArms/);
 assert.match(scene,/createOperatorRig/);
});
