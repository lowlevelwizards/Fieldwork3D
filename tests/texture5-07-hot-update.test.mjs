import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const lab=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
test('continuous slider preview mutates only existing bounded mask textures',()=>{
 assert.match(scene,/previewConditionMasks\(site:Site,level:number\)/);
 assert.match(scene,/image\.data\.set\(conditionFloorPixels/);
 assert.match(scene,/image\.data\.set\(conditionWallPixels/);
 assert.ok(scene.includes('this.patinaRoomSurfaces.length=0'));
 assert.ok(scene.includes('this.patinaWallSurfaces.length=0'));
 assert.ok(lab.includes('stage.previewConditionMasks(session.site,selectedCondition)'));
 assert.ok(lab.includes('maskPreviewFrame=requestAnimationFrame'));
 assert.ok(lab.includes('},260)'));
});
