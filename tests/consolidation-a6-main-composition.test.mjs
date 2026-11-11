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

test('A6 display toggle events are bound once by the existing replay HUD owner',()=>{
 const replay=readFileSync(new URL('../src/ui/breach-replay-hud-controller.ts',import.meta.url),'utf8');
 for(const action of ["replayDirectTracers","replayDirectXray","replayAnalysis","replayPlans","replayNames","replayPlanVersion","replayTraces","replayGhosts","replayTrails"]){
  assert.doesNotMatch(source,new RegExp('ui\\.'+action+'\\.addEventListener'));
  assert.match(replay,new RegExp('ui\\.'+action+'\\.addEventListener'));
 }
 assert.match(replay,/if\(bound\)return/);
});
