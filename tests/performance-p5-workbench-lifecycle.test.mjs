/** P5: retain the expensive weapon Workbench WebGL context across HTML rerenders. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('workbench remounts its existing renderer and updates socket callbacks',()=>{
 const code=src('equipment-weapon-workbench.ts');
 assert.match(code,/private host:HTMLElement/);
 assert.match(code,/private onSelect:\(slot:WorkbenchSocket\)=>void/);
 assert.match(code,/attachHost\(host:HTMLElement,onSelect:\(slot:WorkbenchSocket\)=>void\):void/);
 assert.match(code,/this\.onSelect=onSelect;\s*if\(this\.host===host\)return;/);
 assert.match(code,/this\.resizeObserver\.disconnect\(\);\s*this\.host=host/);
 assert.match(code,/host\.append\(this\.toolbar,this\.canvasHost,this\.choicePanel,this\.caption\)/);
 assert.match(code,/this\.resizeObserver\.observe\(this\.canvasHost\)/);
 assert.match(code,/this\.prepareHost\(host\)/);
 assert.match(code,/this\.renderer\?\.dispose\(\);this\.renderer\?\.forceContextLoss\(\)/);
});

test('Operations Board preserves renderer on same-operator HTML refresh, builds geometry only if changed',()=>{
 const code=src('breach-operations-board-controller.ts');
 const beginning=code.slice(code.indexOf('function renderOperationsBoard(){'),
  code.indexOf(' const heading=document.createElement',code.indexOf('function renderOperationsBoard(){')));
 assert.match(beginning,/rememberQuickWorkbenchView\(\);\s*config\.board\.replaceChildren\(\)/);
 assert.doesNotMatch(beginning,/quickWorkbench\?\.dispose\(\)/);
 assert.match(code,/if\(!kit\.isConnected\)return/);
 assert.match(code,/quickWorkbench&&quickWorkbenchId===member\.id/);
 assert.match(code,/quickWorkbench\.attachHost\(workbenchHost,slot=>showSocket\(slot\)\)/);
 assert.match(code,/visualKey!==quickWorkbenchConfigKey/);
 assert.match(code,/quickWorkbench\.setConfiguration\(member\.weaponConfiguration\)/);
 assert.match(code,/if\(rebuiltGeometry&&view\)quickWorkbench\.restoreViewState\(view\)/);
 assert.match(code,/const select=socketRows\.get\(slot\)\?\.querySelector<HTMLSelectElement>\('select'\)/);
 assert.match(code,/else if\(quickWorkbench\)\{[\s\S]*?quickWorkbench\.dispose\(\)/);
 assert.match(code,/function dispose\(\):void\{\s*quickWorkbench\?\.dispose\(\)/);
});

test('switching operators or closing the workbench still releases the old WebGL context',()=>{
 const code=src('breach-operations-board-controller.ts');
 assert.match(code,/if\(!active\)\{if\(quickWorkbenchId===member\.id\)\{/);
 assert.match(code,/quickWorkbench\?\.dispose\(\);quickWorkbench=null;/);
 assert.match(code,/quickWorkbenchConfigKey=null/);
 assert.match(code,/const visualKey=JSON\.stringify\(member\.weaponConfiguration\)/);
});
