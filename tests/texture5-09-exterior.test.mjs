import test from 'node:test';import assert from 'node:assert/strict';
import {outdoorVisualCondition} from '../src/worldgen/outdoor-condition.ts';
import {zonePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
import {overlayForZone} from '../src/rendering/pixel-overlays.ts';
const site={seed:126,condition:'neglected'};
test('a pristine override removes legacy neglected grass and road wear',()=>{
 const pristine=outdoorVisualCondition({...site,conditionLevel:0});
 assert.equal(pristine,'occupied');
 assert.equal(zonePixelSurface('yard',pristine),'grass');
 assert.equal(zonePixelSurface('parking',pristine),'asphalt');
});
test('decrepit condition changes outside surfaces independent of occupancy',()=>{
 const ruin=outdoorVisualCondition({...site,condition:'occupied',conditionLevel:100});
 assert.equal(ruin,'neglected');
 assert.equal(zonePixelSurface('garden',ruin),'scruffy-grass');
 assert.equal(zonePixelSurface('driveway',ruin),'worn-asphalt');
 assert.equal(outdoorVisualCondition({...site,conditionLevel:100}),ruin);
});
test('legacy categorical surface mode remains unchanged when slider unset',()=>{
 assert.equal(outdoorVisualCondition(site),'neglected');
 assert.equal(outdoorVisualCondition({...site,condition:'busy'}),'busy');
 assert.ok(typeof overlayForZone('neglected','driveway')!=='undefined');
});
