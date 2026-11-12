import test from 'node:test';
import assert from 'node:assert/strict';
import {auditVisualPalettes} from '../scripts/audit-visual-foundation-f4.mjs';

test('F4.4 all building/room accent relationships pass a reproducible audit',()=>{
 const report=auditVisualPalettes();
 assert.equal(report.schemes,33);
 assert.equal(report.purposes,10);
 assert.deepEqual(report.errors,[]);
 assert.deepEqual(auditVisualPalettes(),report);
 assert.equal(report.samples.filter(x=>x.archetype==='motel').length,3);
});
