import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('semantic worldgen audit summarizes each property safely',()=>{
 let decorated=0,outdoors=0,typed=0;
 for(let seed=1;seed<=100;seed++){
  const result=auditGeneratedSite(seed);
  assert.deepEqual(result.errors,[],'seed '+seed);
  assert.ok(result.rooms>=3);
  assert.ok(Number.isInteger(result.archOpenings)&&result.archOpenings>=0);
  assert.ok(Number.isInteger(result.exteriorZones)&&result.exteriorZones>=0);
  assert.ok(Number.isInteger(result.typedProps)&&result.typedProps>=0);
  decorated+=result.dressing;outdoors+=result.exteriorZones;typed+=result.typedProps;
 }
 assert.ok(decorated>0&&outdoors>0&&typed>0);
});
