import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');

test('one fixed contextual command dock with no alternate selector',()=>{
  assert.doesNotMatch(html,/data-context-layout|context-layout-options/);
  assert.match(main,/ui\.context\.dataset\.layout='dock'/);
  assert.match(main,/ui\.tacticalHud\.insertBefore\(ui\.context,ui\.quickStates\)/);
  assert.match(css,/\.context-tools\[data-layout="dock"\]/);
  assert.doesNotMatch(css,/data-layout="bubbles"|context-layout-settings/);
  assert.doesNotMatch(main,/bubbleSlots|bubblePlacement|paletteMotion|contextTether|placeContextMenu/);
});

test('stationary dock still shares real contextual actions and dismisses on targeting',()=>{
  assert.match(main,/const paletteChoices=choices\.filter\(choice=>choice\.group!=='state'\)/);
  assert.match(main,/buckets\.primary\.append\(button\)/);
  assert.match(main,/ui\.context\.hidden=false/);
  assert.match(main,/ui\.context\.style\.pointerEvents='auto'/);
  assert.match(main,/function hideContextPalette\(\)\{[\s\S]*?ui\.context\.hidden=true/);
  assert.match(main,/const handleContextAction=\(event:MouseEvent\)=>/);
  assert.doesNotMatch(main,/advanceContextPalette/);
});

test('dock preserves adaptive button sizes above persistent operator state strip',()=>{
  assert.match(css,/\.context-tools\[data-layout="dock"\] \.context-primary\{/);
  assert.match(css,/min-height:43px!important/);
  assert.match(css,/@media\(max-height:470px\) and \(min-width:600px\)/);
  assert.match(html,/id="quickStates"/);
});
