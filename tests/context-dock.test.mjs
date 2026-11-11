import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
const palette=readFileSync(new URL('../src/ui/tactical-palette-controller.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');

test('Dock stays default with the original Floating option and no Bubbles',()=>{
  assert.match(html,/data-context-layout="dock" aria-pressed="true"/);
  assert.match(html,/data-context-layout="floating" aria-pressed="false">FLOATING/);
  assert.doesNotMatch(html,/data-context-layout="bubbles"|FLOAT · SMART/);
  assert.match(palette,/let placement:'dock'\|'floating'='dock'/);
  assert.match(palette,/localStorage\.getItem\(FLOAT_PREF\)==='floating'/);
  assert.match(palette,/localStorage\.setItem\(FLOAT_PREF,next\)/);
  assert.match(palette,/config\.tacticalHud\.insertBefore\(context,config\.quickStates\)/);
});

test('classic Floating uses original spring and route-aware placement, not Smart constraints',()=>{
  assert.match(palette,/new PaletteMotion\(\)/);
  assert.match(palette,/const result=placeContextMenu\(\{/);
  assert.match(palette,/tether\.style\.transform='rotate\('/);
  assert.match(runtime,/config\.advanceContextPalette\(dt\)/);
  assert.match(main,/advanceContextPalette,/);
  assert.match(palette,/heldPointers\.size>0\|\|placementKey===lastPlacementKey/);
  assert.doesNotMatch(main,/quietFloatingPocket|quietTacticalSpace|quietReadyAt/);
  assert.doesNotMatch(css,/Smart floating|data-layout="bubbles"/);
  assert.match(css,/#contextTether\{/);
});

test('both layouts share the real contextual command dispatcher',()=>{
  assert.match(palette,/const paletteChoices=actions\.filter\(choice=>choice\.group!=='state'\)/);
  assert.match(palette,/const destination=placement==='floating'\?/);
  assert.match(palette,/buckets\[choice\.group==='advanced'\?'primary':choice\.group\]:\s*buckets\.primary/);
  assert.match(main,/hudController\.bindContextActions\(/);
  assert.match(hud,/config\.ui\.context\.addEventListener\('click',handleContextAction\)/);
  assert.match(hud,/config\.ui\.quickStates\.addEventListener\('click',handleContextAction\)/);
  assert.match(main,/function hideContextPalette\(\):void/);
  assert.match(palette,/context\.style\.pointerEvents='auto'/);
});

test('stationary dock retains adaptive buttons above the persistent state strip',()=>{
  assert.match(css,/\.context-tools\[data-layout="dock"\] \.context-primary\{/);
  assert.match(css,/min-height:43px!important/);
  assert.match(css,/@media\(max-height:470px\) and \(min-width:600px\)/);
  assert.match(html,/id="quickStates"/);
});
