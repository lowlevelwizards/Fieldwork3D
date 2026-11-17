import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const palette=read('src/ui/tactical-palette-controller.ts');
const hud=read('src/ui/tactical-hud-controller.ts');
test('UI.7E same-operator stale waypoint or door palette cannot dispatch to new selection',()=>{
 assert.match(palette,/context\.dataset\.scopeKey=identity/);
 assert.match(palette,/context\.dataset\.scopeKey=''/);
 assert.match(hud,/if\(surface===config\.ui\.context\)\{/);
 assert.match(hud,/surface\.dataset\.scopeKey!==currentScope/);
 assert.match(hud,/config\.selectedActiveWatch\?'active-watch':'here'/);
 assert.match(hud,/if\(!surface\|\|surface\.hidden\|\|surface\.dataset\.owner!==config\.selected\)return/);
});
test('UI.7E accessibility description refreshes when context tooltip changes',()=>{
 assert.match(palette,/c\.title\?\?''/);
 assert.match(palette,/button\.setAttribute\('aria-description'/);
 assert.match(palette,/button\.title=choice\.title\?\?choice\.label/);
});
