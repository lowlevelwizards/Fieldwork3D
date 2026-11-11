import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const game=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const screens=readFileSync(new URL('../src/ui/breach-mission-screens.ts',import.meta.url),'utf8');
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('Preferences exposes an accessible, mutually exclusive Focus control',()=>{
 const settingsIndex=page.indexOf('data-site-panel="preferences"');
 const focusIndex=page.indexOf('MINIATURE FOCUS');
 assert.ok(settingsIndex>=0&&focusIndex>settingsIndex);
 assert.match(page,/class="miniature-focus-preference" hidden/);
 assert.match(page,/data-miniature-focus="off" aria-pressed="true"/);
 for(const mode of ['off','subtle','strong','replay'])
   assert.match(page,new RegExp('data-miniature-focus="'+mode+'"'));
 assert.match(screens,/miniatureFocusButtons/);
 assert.match(screens,/syncMiniatureFocusPreference/);
 assert.match(screens,/writeStoredText\(MINIATURE_FOCUS_STORAGE_KEY,value\)/);
 assert.match(game,/getFocusMode:\(\)=>stage\?\.getMiniatureFocusMode\(\)/);
 assert.match(scene,/getMiniatureFocusMode\(\)/);
 assert.match(scene,/setMiniatureFocusMode\(mode:MiniatureFocusMode\)/);
});
