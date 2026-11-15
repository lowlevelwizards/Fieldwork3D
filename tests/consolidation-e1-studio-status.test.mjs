import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
test('E1.G Studio avoids redundant status text while preserving preview, focus and lightweight path',()=>{
 const start=studio.indexOf('function refresh(options:{helmetDetailsOnly?:boolean}={}){');
 const end=studio.indexOf('function populate(){',start);
 assert.ok(end>start);
 const refresh=studio.slice(start,end);
 for(const invariant of [
  "const lightweight=options.helmetDetailsOnly===true&&!referenceOpen&&!identityMode;",
  'if(!lightweight)renderCategories();',
  "if(!lightweight||activeStep==='items')",
  'renderMaterials();','renderPresetMenu();','referenceBrowser.refresh(readOnly);','posePreview();'
 ])assert.ok(refresh.includes(invariant),'lost existing Studio path: '+invariant);
 assert.match(refresh,/writeDomText\(\$\('studioTitle'\)/);
 assert.match(refresh,/writeDomText\(applyButton/);
 assert.match(refresh,/writeDomText\(compareButton/);
 assert.match(studio,/if\(focusInEditor\)\{/);
 assert.match(studio,/replacement\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(studio,/if\(sheet\)sheet\.scrollTop=savedScroll/);
});
