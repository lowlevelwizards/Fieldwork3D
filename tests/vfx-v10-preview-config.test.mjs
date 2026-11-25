import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRODUCTION_VFX} from '../src/rendering/breach-vfx-preview-config.ts';
test('V15 production enables combat effects and temporarily retires experimental foliage',()=>{
 assert.deepEqual(PRODUCTION_VFX,{suite:true,grass:false,grassCell:192,bush:false,blood:true,impacts:true,pulses:true,glass:true,smoke:true,evidence:true,lights:true});
 assert.ok(Object.isFrozen(PRODUCTION_VFX));
});
test('renderer uses fixed production VFX, not query-string overrides',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const config=readFileSync(new URL('../src/rendering/breach-vfx-preview-config.ts',import.meta.url),'utf8');
 assert.match(source,/private readonly vfxPreview=PRODUCTION_VFX;/);
 assert.doesNotMatch(config,/URLSearchParams|location\.search|params\.get/);
 assert.doesNotMatch(source,/resolveVfxPreview|['"]vfx(?:Suite|Grass|GrassCell|Bush|Blood|Impacts|Pulses|Glass|Smoke|Evidence|Lights)['"]/);
});
