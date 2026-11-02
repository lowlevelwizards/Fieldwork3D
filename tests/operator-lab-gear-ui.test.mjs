import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('kit comparison has a compact recoverable mobile layout',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/body\.kit-compare main/);
 assert.match(html,/EXIT KIT COMPARISON|id="compareKit"/);
 assert.match(lab,/classList\.remove\('kit-compare'\)/);
 assert.match(lab,/classList\.add\('kit-compare'\)/);
 assert.match(lab,/if\(kitComparing\)endKitComparison\(\)/);
 assert.match(lab,/canvas\.dataset\.triangles/);
});
