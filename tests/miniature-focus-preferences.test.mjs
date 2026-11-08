import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const game=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('Preferences exposes an accessible, mutually exclusive Focus control',()=>{
 const settingsIndex=page.indexOf('data-site-panel="preferences"');
 const focusIndex=page.indexOf('MINIATURE FOCUS');
 assert.ok(settingsIndex>=0&&focusIndex>settingsIndex);
 for(const mode of ['off','subtle','strong','replay'])
   assert.match(page,new RegExp('data-miniature-focus="'+mode+'"'));
 assert.match(game,/miniatureFocusButtons/);
 assert.match(game,/syncMiniatureFocusPreference/);
 assert.match(game,/localStorage\.setItem\(MINIATURE_FOCUS_STORAGE_KEY,value\)/);
 assert.match(scene,/getMiniatureFocusMode\(\)/);
 assert.match(scene,/setMiniatureFocusMode\(mode:MiniatureFocusMode\)/);
});
