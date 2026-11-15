import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
test('E1.F keeps live help, command affordances, and screen reader state while avoiding identical writes',()=>{
 for(const kept of [
  'teaching.current(now)','targeting.isArmed','resolveHudPresentation({',
  'input.hint.hidden=!presentation.showGuidance','input.installHelp(button)',
  "if(choice.pressed===undefined)button.removeAttribute('aria-pressed')",
  "const current=input.plannedControl(node?.id)"
 ])assert.ok(hud.includes(kept),kept);
 assert.match(hud,/writeDomText\(input\.hint/);
 assert.match(hud,/writeDomText\(quickScope/);
 assert.match(hud,/writeDomAttribute\(quickStates,'aria-label'/);
 assert.match(hud,/writeDomAttribute\(button,'aria-pressed'/);
 assert.match(hud,/if\(document\.body\.dataset\.hudPhase!==phase\)/);
 assert.match(hud,/hudHeight\.sync\(input\.tacticalHud\)/);
});
