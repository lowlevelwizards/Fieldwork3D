import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V6.3 places shot sequence, view controls, and clip action with figure',()=>{
 const combat=source('src/ui/breach-after-action-combat.ts');
 assert.match(combat,/figureColumn\.append\(figureTools,figure\)/);
 assert.match(combat,/figureColumn\.append\(sequence\)/);
 assert.match(combat,/figureColumn\.append\(button\(selected\?/);
 assert.match(combat,/root\.append\(contactHeader\)/);
 assert.doesNotMatch(combat,/root\.append\(sequence\)/);
});
test('V6.3 ambiguous down recording does not mislabel armor as a verified incapacitating wound',()=>{
 const combat=source('src/ui/breach-after-action-combat.ts');
 assert.match(combat,/s\.down&&s\.outcome==='damaging'/);
 assert.match(combat,/DOWN STATE RECORDED/);
 const overlay=source('src/ui/breach-after-action-anatomy-overlay.ts');
 assert.match(overlay,/depthTest:true,depthWrite:false/);
});
