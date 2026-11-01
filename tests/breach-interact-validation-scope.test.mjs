import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('plan editing does not execute physical interactions',()=>{
 const source=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const validation=source.slice(source.indexOf('function validEditedPlan('),source.indexOf('export function movePlanNode('));
 const execution=source.slice(source.indexOf('function runOrders('),source.indexOf('function runOrders(')+12000);
 assert.ok(!validation.includes('pop(a)'));
 assert.ok(!validation.includes('movePhysicalProp('));
 assert.ok(execution.includes("n.kind==='interact'"));
 assert.ok(execution.includes('movePhysicalProp('));
 assert.ok(execution.includes('manipulateWindow('));
});
