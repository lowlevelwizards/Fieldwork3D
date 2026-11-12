import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('P1.5b profiles nine isolated scene CPU phases',()=>{
 for(const key of ['environment','camera','disclosure','actors',
   'effects','fog','shadows','postCamera','gpuSubmit'])
  assert.ok(src.includes("this.markScenePhase('"+key+"')"),key);
 assert.match(src,/scenePhases:this\.profileSceneUpdate\?this\.scenePhases:null/);
 assert.match(src,/if\(!this\.profileSceneUpdate\)return/);
 assert.match(src,/this\.renderMiniatureFocus\(camera\)/);
});
