import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V6 mobile recovery: deferred import failure and graphics failure are distinguished',()=>{
 const s=read('src/ui/breach-after-action-controller.ts');
 assert.match(s,/failure:'module'\|'graphics'\|null/);
 assert.match(s,/AN APP UPDATE MAY BE AVAILABLE/);
 assert.match(s,/3D MODULE COULD NOT LOAD/);
 assert.match(s,/console\.warn\('\[After Action 3D\] Deferred model module failed to load'/);
 assert.match(s,/displayModelFailure\(root,current,owner/);
 assert.match(s,/retry\.textContent='RETRY 3D'/);
 assert.match(s,/owner\.version\+\+;owner\.pending=false/);
});
test('V6 mobile recovery: restrained WebGL startup and rig error diagnostics',()=>{
 const s=read('src/ui/breach-after-action-model.ts');
 assert.match(s,/antialias:!compact/);
 assert.match(s,/compact\?1:1\.25/);
 assert.match(s,/Historical rig could not build/);
 assert.match(s,/WebGL context unavailable/);
});
test('V6 mobile recovery: tall paper-doll is not squeezed by lengthy labels',()=>{
 const s=read('src/breach-style.css');
 assert.match(s,/\.fw-v3-combat-figure:has\(\.fw-v3-paper\)/);
 assert.match(s,/width:min\(50vw,210px\)/);
 assert.match(s,/max-height:none;max-width:100%;aspect-ratio:166 \/ 235/);
 assert.match(s,/#fieldwork-update-compact/);
});
