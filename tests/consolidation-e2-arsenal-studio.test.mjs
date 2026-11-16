/** E2.A–B: unchanged presentation inputs must not recreate live controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const arsenal=readFileSync(new URL('../src/arsenal/workbench-screen.ts',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
const arsenalSmoke=readFileSync(new URL('../scripts/smoke-arsenal-navigation-e1.mjs',import.meta.url),'utf8');
const studioSmoke=readFileSync(new URL('../scripts/smoke-operator-studio.mjs',import.meta.url),'utf8');

test('E2.A retains part nodes and re-evaluates click compatibility from live draft',()=>{
 const scope=arsenal.slice(arsenal.indexOf('const choiceButtons=new Map'),
  arsenal.indexOf('// Persistent navigation:'));
 assert.match(scope,/choiceButtons\.get\(key\)/);
 assert.match(scope,/choiceButtons\.set\(key,entry\)/);
 assert.match(scope,/proposeArsenalPartChange\(draft\.working,activeSlot,part\.id\)/);
 assert.match(scope,/const live=proposeArsenalPartChange/);
 assert.match(scope,/if\(option\.getAttribute\('aria-pressed'\)!==pressed\)/);
 assert.match(scope,/if\(choiceList\.children\[index\]!==desired\[index\]\)/);
 assert.doesNotMatch(scope,/choiceList\.replaceChildren\(/);
 assert.match(arsenalSmoke,/E2\.A compatibility refresh remounted an existing part/);
 assert.match(arsenalSmoke,/E2\.A part choice lost identity, fit or focus/);
});
test('E2.B reuses material controls only when identity, kit and editor state match',()=>{
 const scope=studio.slice(studio.indexOf('let materialRenderKey:'),
  studio.indexOf('const w=current(),outfit=resolvedWardrobe',studio.indexOf('let materialRenderKey:')));
 assert.match(scope,/selected,activeCategory,identityMode,readOnly,comparingSaved,saveInFlight/);
 assert.match(scope,/current\(\),p\.loadout,p\.appearanceSeed/);
 assert.match(scope,/nextKey===materialRenderKey/);
 assert.match(scope,/applyStudioStep\(\);return/);
 assert.match(scope,/materialRenderKey=nextKey/);
 assert.match(studioSmoke,/E2\.B same-category refresh rebuilt unchanged materials/);
});
