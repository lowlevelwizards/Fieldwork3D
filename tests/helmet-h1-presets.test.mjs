import test from 'node:test';
import assert from 'node:assert/strict';
import {HELMET_H1_PRESETS,applyHelmetPreset} from '../src/operator-helmet-preset-catalog.ts';
import {headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {resolveHelmetSetup} from '../src/operator-helmet-setup-policy.ts';
test('H1 shipped presets are complete and contain compatible modules',()=>{
 assert.equal(HELMET_H1_PRESETS.length,12);
 for(const p of HELMET_H1_PRESETS){
  assert.ok(!p.print||headwearCamoChoices(p.shell).includes(p.print),p.id);
  const w=applyHelmetPreset(initialWardrobe(),p.shell,p.id);
  const loaded=readWardrobe(w);
  assert.equal(loaded.helmetSetup?.presetOrigin,p.id);
  assert.equal(resolveHelmetSetup(p.shell,loaded.helmetSetup).suppressed.length,0,p.id);
 }
});
test('preset applies cosmetics only and mismatched shell is a no-op',()=>{
 const w=initialWardrobe();
 assert.equal(applyHelmetPreset(w,'ach','fast-basic'),w);
 const selected=applyHelmetPreset(w,'fast-sf','fast-basic');
 assert.deepEqual(selected.styles,w.styles);
 assert.equal(selected.helmetSetup?.rails,'arc');
});
