import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL_FINISH_FAMILIES,arsenalFinishFamily,arsenalPhysicalPartId,
 arsenalFinishOption,validArsenalFinishTaxonomy}
 from '../src/arsenal/finishes.ts';
test('finish families are real authored variants with identical physical envelopes',()=>{
 assert.deepEqual(validArsenalFinishTaxonomy(),[]);
 assert.ok(ARSENAL_FINISH_FAMILIES.length>=14);
 assert.equal(arsenalPhysicalPartId('ak-wood-red'),'ak-wood');
 assert.equal(arsenalPhysicalPartId('hk33-fixed-stock-black'),'hk33-fixed-stock');
 assert.equal(arsenalPhysicalPartId('hk-mp5-retract-stock'),'hk-mp5-retract-stock');
 assert.equal(arsenalFinishOption('ak-wood-amber')?.label,'Honey Birch');
 assert.equal(arsenalFinishFamily('ak-wood-red')?.slot,'stock');
});
test('real-world geometry and magazine/feed variants are not conflated with finishes',()=>{
 assert.equal(arsenalFinishFamily('ak-underfolder'),undefined);
 assert.equal(arsenalFinishFamily('ak-rpk-mag45'),undefined);
 assert.equal(arsenalFinishFamily('hk-mp5k-pdw-stock'),undefined);
 assert.equal(arsenalFinishFamily('ar-magpoly'),undefined);
});
