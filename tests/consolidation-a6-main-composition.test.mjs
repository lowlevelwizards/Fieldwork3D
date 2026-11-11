import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const elements=readFileSync(new URL('../src/ui/breach-ui-elements.ts',import.meta.url),'utf8');
test('A6 fixed tactical DOM registry lives in stateless UI view module',()=>{
 assert.match(source,/createBreachUiElements\(\)/);
 assert.doesNotMatch(source,/const ui=\s*\{/);
 assert.doesNotMatch(source,/decorateIconButton\(/);
 assert.match(elements,/export function createBreachUiElements\(\)/);
 assert.match(elements,/requiredBreachElement/);
 assert.match(elements,/replayNextEvent/);
});
