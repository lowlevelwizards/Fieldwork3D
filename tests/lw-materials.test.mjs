import test from 'node:test';import assert from 'node:assert/strict';
import {MATERIALS,materialForFixture,surfaceResistance} from '../src/breach-materials.ts';
test('real material classification is stable across visual palettes',()=>{
 assert.equal(materialForFixture('sofa'),'upholstery');
 assert.equal(materialForFixture('locker'),'sheet-metal');
 assert.equal(materialForFixture('window-sill'),'brick');
 assert.ok(surfaceResistance('concrete',10)>surfaceResistance('drywall',10));
 assert.ok(surfaceResistance('hardwood',20)>surfaceResistance('upholstery',20));
 assert.equal(MATERIALS.glass.penetrable,true);
 assert.equal(MATERIALS.steel.penetrable,false);
});
