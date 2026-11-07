import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new viewport uses real geometry and bound-based framing without old socket dots',()=>{
 const source=file('src/arsenal/viewport.ts');
 assert.match(source,/buildWeaponSilhouette/);
 assert.match(source,/buildWeaponAccessories/);
 assert.match(source,/partVisualBounds/);
 assert.match(source,/workbenchFitDistance/);
 assert.doesNotMatch(source,/setMode\(|socketButtons|weapon-workbench-dot/);
});
test('inspector is a standalone, disposable draft-only screen, not a Campaign editor',()=>{
 const source=file('src/arsenal/workbench-screen.ts');
 assert.match(source,/new ArsenalViewport/);
 assert.match(source,/viewer\.dispose\(\)/);
 assert.doesNotMatch(source,/equipCampaignWeapon|funds\s*=|inventory\s*=/);
});
