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
test('Debrief lineup opens 1.5 zoom steps closer without camera buttons',()=>{
 const model=source('src/ui/breach-after-action-model.ts');
 const css=source('src/breach-style.css');
 assert.match(model,/const DEFAULT_SQUAD_ZOOM=\.82;/);
 assert.ok(Math.abs(.82-(1-1.5*.12))<1e-9);
 assert.match(model,/let pitch=\.16,zoom=DEFAULT_SQUAD_ZOOM/);
 assert.match(model,/zoom=operatorId===null\?DEFAULT_SQUAD_ZOOM:1/);
 assert.doesNotMatch(model,/viewTools|modelButton|Reset model view|Zoom in|Zoom out/);
 assert.doesNotMatch(css,/fw-v6-model-tools/);
 assert.match(model,/canvas\.addEventListener\('pointermove',move\)/);
 assert.match(model,/canvas\.addEventListener\('wheel',wheel/);
 assert.doesNotMatch(model,/setInterval\(/);
});
test('V6.5 timeline caps default cluster rows while preserving all items',()=>{
 const timeline=source('src/ui/breach-after-action-timeline.ts');
 assert.match(timeline,/activeCluster\.events\.slice\(0,5\)/);
 assert.match(timeline,/activeCluster\.events\.slice\(5\)/);
 assert.match(timeline,/SHOW '\+\(activeCluster\.events\.length-5\)/);
 assert.match(timeline,/actions\.select\(e\.key\)/);
});
