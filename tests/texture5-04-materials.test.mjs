import test from 'node:test';
import assert from 'node:assert/strict';
import {ageMaterialColor} from '../src/rendering/condition-materials.ts';
test('pristine finish is unchanged and age has material-specific reactions',()=>{
 const red=0xc49a80;
 assert.equal(ageMaterialColor(red,'painted-metal',0),red);
 assert.equal(ageMaterialColor(red,'wood',0),red);
 assert.notEqual(ageMaterialColor(red,'wood',100),red);
 assert.notEqual(ageMaterialColor(red,'wood',100),ageMaterialColor(red,'painted-metal',100));
 assert.equal(ageMaterialColor(red,'wood',100),ageMaterialColor(red,'wood',100));
 assert.ok(ageMaterialColor(red,'wood',50)!==ageMaterialColor(red,'wood',100));
});
