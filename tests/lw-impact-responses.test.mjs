import test from 'node:test';import assert from 'node:assert/strict';
import {materialResponse} from '../src/breach-impact-responses.ts';
test('materials generate differentiated bounded impact events',()=>{
 const glass=materialResponse('glass'),metal=materialResponse('steel');
 assert.equal(glass.sound,'glass');
 assert.equal(metal.visual,'metal');
 assert.ok(glass.debris<=8&&metal.debris<=8);
 assert.notEqual(materialResponse('softwood').sound,metal.sound);
});
