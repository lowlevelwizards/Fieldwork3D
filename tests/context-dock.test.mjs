import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');

test('Dock stays default with the original Floating option and no Bubbles',()=>{
  assert.match(html,/data-context-layout="dock" aria-pressed="true"/);
  assert.match(html,/data-context-layout="floating" aria-pressed="false">FLOATING/);
  assert.doesNotMatch(html,/data-context-layout="bubbles"|FLOAT · SMART/);
  assert.match(main,/let contextPlacement:'dock'\|'floating'='dock'/);
  assert.match(main,/localStorage\.getItem\(FLOAT_PREF\)==='floating'/);
  assert.match(main,/localStorage\.setItem\(FLOAT_PREF,next\)/);
  assert.match(main,/ui\.tacticalHud\.insertBefore\(ui\.context,ui\.quickStates\)/);
});

test('classic Floating uses original spring and route-aware placement, not Smart constraints',()=>{
  assert.match(main,/new PaletteMotion\(\)/);
  assert.match(main,/const placement=placeContextMenu\(\{/);
  assert.match(main,/contextTether\.style\.transform='rotate\('/);
  assert.match(main,/advanceContextPalette\(dt\)/);
  assert.match(main,/contextPointerIds\.size>0\|\|placementKey===lastPlacementKey/);
  assert.doesNotMatch(main,/quietFloatingPocket|quietTacticalSpace|quietReadyAt/);
  assert.doesNotMatch(css,/Smart floating|data-layout="bubbles"/);
  assert.match(css,/#contextTether\{/);
});

test('both layouts share the real contextual command dispatcher',()=>{
  assert.match(main,/const paletteChoices=choices\.filter\(choice=>choice\.group!=='state'\)/);
  assert.match(main,/const destination=contextPlacement==='floating'\?/);
  assert.match(main,/buckets\[choice\.group==='advanced'\?'primary':choice\.group\]:buckets\.primary/);
  assert.match(main,/ui\.context\.addEventListener\('click',handleContextAction\)/);
  assert.match(main,/function hideContextPalette\(\)/);
  assert.match(main,/ui\.context\.style\.pointerEvents='auto'/);
});

test('stationary dock retains adaptive buttons above the persistent state strip',()=>{
  assert.match(css,/\.context-tools\[data-layout="dock"\] \.context-primary\{/);
  assert.match(css,/min-height:43px!important/);
  assert.match(css,/@media\(max-height:470px\) and \(min-width:600px\)/);
  assert.match(html,/id="quickStates"/);
});
