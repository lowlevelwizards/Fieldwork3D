import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {ARSENAL_REFERENCES,ARSENAL_PLATFORMS} from '../src/arsenal/catalog.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('standalone Arsenal is included in the Vite multi-entry build without replacing Breach',()=>{
 assert.match(source('vite.config.ts'),/arsenal:\s*'arsenal\.html'/);
 assert.match(source('arsenal.html'),/src\/arsenal\/gallery-main\.ts/);
 assert.match(source('arsenal.html'),/<main id="arsenalRoot"/);
});
test('gallery displays the full existing authored model set, not generic class choices',()=>{
 assert.equal(ARSENAL_REFERENCES.length,FAMILY_PRESETS.length);
 assert.ok(ARSENAL_PLATFORMS.some(x=>x.name==='MP5'));
 assert.ok(ARSENAL_PLATFORMS.some(x=>x.name==='G3'));
 assert.ok(ARSENAL_PLATFORMS.some(x=>x.name==='HK33 / HK53'));
 assert.match(source('src/arsenal/gallery-main.ts'),/arsenalRecipeFromLegacy/);
});
test('gallery thumbnails reuse real weapon geometry and one renderer',()=>{
 const code=source('src/arsenal/thumbnailer.ts');
 assert.match(code,/buildWeaponSilhouette/);
 assert.match(code,/buildWeaponAccessories/);
 assert.match(code,/workbenchFitDistance/);
 assert.match(code,/private renderer:THREE\.WebGLRenderer\|null=null/);
});
