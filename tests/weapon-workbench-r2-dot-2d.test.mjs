import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const preview=read('src/equipment-weapon-workbench.ts');
const quick=read('src/breach-main.ts');
const campaign=read('src/campaign-ui.ts');

test('R2 mobile sockets use tiny translucent dots over generous invisible hit zones',()=>{
 assert.match(preview,/width:44px;height:44px/);
 assert.match(preview,/width:8px;height:8px;border-radius:50%/);
 assert.match(preview,/button\.append\(dot\)/);
 assert.match(preview,/setAttribute\('aria-label','Edit '\+anchor\.name\)/);
 assert.doesNotMatch(preview,/button\.textContent=anchor\.slot/);
 assert.match(preview,/this\.leaderPath\.setAttribute\('d'/);
 assert.match(preview,/this\.revealed&&hasAnchor/);
});
test('R2 replacement panel retains one authoritative compatible selection path',()=>{
 assert.match(preview,/showSocketChoices\(slot:WorkbenchSocket,select:HTMLSelectElement\)/);
 assert.match(preview,/for\(const option of Array\.from\(select\.options\)\)/);
 assert.match(preview,/select\.dispatchEvent\(new Event\('change'/);
 assert.match(quick,/quickWorkbench\?\.showSocketChoices\(slot,select\)/);
 assert.match(quick,/selectedQuickWeaponSockets/);
 assert.match(campaign,/this\.workbench\?\.showSocketChoices\(socket,select\)/);
});
test('R2 2D is an orthographic, side-on, non-rotating view and allows return to 3D',()=>{
 assert.match(preview,/new THREE\.OrthographicCamera/);
 assert.match(preview,/this\.model\.rotation\.set\(this\.in2D\?0:this\.pitch,this\.in2D\?0:this\.yaw,0\)/);
 assert.match(preview,/this\.sideCamera\.position\.set\(2,0,100\)/);
 assert.match(preview,/this\.pointerPositions\.size===1&&!this\.in2D/);
 assert.match(preview,/if\(this\.in2D\)this\.drawFallback\(w,h\)/);
 assert.match(preview,/this\.in2D=!this\.in2D/);
 assert.match(preview,/this\.renderer\.domElement\.style\.display=this\.in2D\?'none':'block'/);
 assert.match(preview,/private distance=62/);
});
