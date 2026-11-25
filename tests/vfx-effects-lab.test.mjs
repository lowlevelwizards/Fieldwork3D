import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('effects lab is linked from both development menus and built independently',()=>{
 for(const p of ['index.html','src/campaign-ui.ts'])assert.match(read(p),/breach-visual-lab\.html/);
 assert.match(read('vite.config.ts'),/breachVisualLab:/);
 const html=read('breach-visual-lab.html');
 for(const id of ['hit','down','pool','stabilize','stone','wood','metal','dust','glass','flash','muzzle','vegetation','repeat','pause','step','reset','gameZoom'])assert.ok(html.includes('id="'+id+'"'),id);
 const source=read('src/breach-visual-lab.ts');
 assert.match(source,/new TacticalScene3D\(/);assert.match(source,/sampleBleedingEvidence\(session,dt\)/);
 assert.match(source,/advanceTransientSimulationEffects\(session,dt\)/);
 assert.match(source,/stage\.view\.zoom=1\.48/);
});