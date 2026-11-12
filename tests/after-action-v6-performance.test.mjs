import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V6.1 model initialization yields between rigs and never builds in draw',()=>{
 const rig=source('src/ui/breach-after-action-model.ts');
 assert.doesNotMatch(rig,/for\(const actor of roster\)build\(actor\)/);
 assert.match(rig,/const queueModels=/);
 assert.match(rig,/buildTimer=window\.setTimeout/);
 const focus=rig.slice(rig.indexOf('const focus='),rig.indexOf('const drawNow='));
 assert.doesNotMatch(focus,/\bbuild\(/);
 assert.match(rig,/if\(width!==lastWidth\|\|height!==lastHeight\)/);
 assert.match(rig,/cancelAnimationFrame/);
});
test('V6.1 selection preserves the mounted viewport and source evidence',()=>{
 const ctrl=source('src/ui/breach-after-action-controller.ts');
 assert.match(ctrl,/nextHost\.replaceWith\(oldHost\)/);
 assert.match(ctrl,/oldHost\.dataset\.afterModel=nextHost\.dataset\.afterModel/);
 assert.match(ctrl,/presentModel\(root,s\.recorder,squadHost\?\?combatHost/);
 assert.match(ctrl,/currentCombatEvidence\(root\)/);
});
