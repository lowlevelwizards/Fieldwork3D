import test from 'node:test';
import assert from 'node:assert/strict';
import {RIG_VISUAL_BUDGET,rigVisualBudget}
 from '../src/operator-rig-visual-standards.ts';
import {rigContactFrame,RIG_PANEL_INNER_FACES}
 from '../src/operator-rig-contact-frame.ts';
test('R3: all eleven rig style families satisfy support and pouch readability budgets',()=>{
 assert.equal(Object.keys(RIG_VISUAL_BUDGET).length,11);
 for(const [name,b] of Object.entries(RIG_VISUAL_BUDGET)){
  assert.ok(b.web>=.9&&b.shoulder>=1.2,name+' webbing');
  assert.ok(b.flank>=1&&b.projection>=.18,name+' flank and pocket');
 }
 assert.ok(rigVisualBudget('sadf-webbing').shoulder>
  rigVisualBudget('micro-rig').shoulder);
});
test('R3: silhouette budgets preserve real garment/armor contact',()=>{
 for(const rig of ['micro-rig','chest-placard','light-rig','chicom-rig',
  'bandolier','split-front','full-chest','lbv','sadf-webbing'])
  for(const armor of ['armor-bare','plate-jpc','plate-heavy','plate-legacy'])
   for(const top of ['combat-shirt','bdu-shirt','gorka-jacket']){
    const f=rigContactFrame(armor,top,rig);
    assert.ok(Math.abs(f.rigShiftX+RIG_PANEL_INNER_FACES[rig]-
     f.front.x-.14)<.0001,rig+' '+armor+' '+top);
   }
});
