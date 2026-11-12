import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V6.5 mission outcome carries authoritative squad context',()=>{
 const html=source('index.html'),ui=source('src/ui/breach-mission-debrief.ts');
 assert.match(html,/id="afterActionTakeaway"/);
 assert.match(ui,/stats\.squad\.filter\(op=>op\.survived&&op\.injury>0\)/);
 assert.match(ui,/stats\.objective\?'OBJECTIVE SECURED'/);
 assert.match(ui,/stats\.survived\+' \/ '\+stats\.squad\.length/);
});
test('V6.5 3D view has accessible manual zoom and reset with no animation loop',()=>{
 const model=source('src/ui/breach-after-action-model.ts');
 assert.match(model,/Reset model view/);
 assert.match(model,/Zoom out/);
 assert.match(model,/Zoom in/);
 assert.match(model,/host\.append\(viewTools\)/);
 assert.doesNotMatch(model,/setInterval\(/);
});
test('V6.5 timeline caps default cluster rows while preserving all items',()=>{
 const timeline=source('src/ui/breach-after-action-timeline.ts');
 assert.match(timeline,/activeCluster\.events\.slice\(0,5\)/);
 assert.match(timeline,/activeCluster\.events\.slice\(5\)/);
 assert.match(timeline,/SHOW '\+\(activeCluster\.events\.length-5\)/);
 assert.match(timeline,/actions\.select\(e\.key\)/);
});
