import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_SIZE,HEADWEAR_CAMO_DENSITY,headwearCamoSize,
 headwearCamoChoices,headwearCamoIndices,headwearCamoCoverage,
 headwearCamoPixels,resolvedHeadwearCamo,headwearCamoPlacement,
 headwearCamoFrontBrownFraction,headwearCamoM81CrownCoverage,headwearCamoAppliedCoverage,nextHeadwearCamoRoll} from '../src/operator-headwear-camo.ts';
import {headwearCamoTexture,headwearDetailTexture,headwearFinishTexture}
 from '../src/operator-headwear-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {CAMO_CATALOG,CAMO_ORIGINS,filterCamoCatalog}
 from '../src/operator-headwear-camo-catalog.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {HEADWEAR_SOLID_COLORS,headwearColorChoices} from '../src/operator-headwear-colors.ts';

const pose=(kit,wardrobe)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,equipment:kit,wardrobe
});
// Independent test shard; original coverage and assertions preserved.
test('operator lab exposes raw art, 3x3 repeat and live selected headwear',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['headwearCamoGrid','headwearCamoCompareGrid','headwearCamoArt','headwearCamoTiled','headwearCamoChoice'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/paintHeadwearCamo\(.*preview,3\)/);
 assert.match(js,/headwearCamo:id/);
 assert.match(js,/headwearCamo:undefined/);
 assert.match(html,/ORIGINAL · 32×32 PIXELS/);
 assert.match(html,/TILED · 3×3 REPEAT/);
 assert.match(html,/fabric-specific print density/);
 assert.match(js,/HEADWEAR_CAMO_DENSITY/);
 assert.match(js,/renderHeadwearCamoComparison/);
 assert.match(js,/HEADWEAR_CAMO_IDS/);
 assert.match(js,/camo-study-views/);
 assert.match(html,/COMPARE ALL 62/);
 assert.match(js,/headwearCamoSize/);
});
test('pattern family density and pigment scales preserve hierarchy',()=>{
 assert.equal(HEADWEAR_CAMO_DENSITY['m81-woodland'],1);
 assert.equal(HEADWEAR_CAMO_DENSITY['three-color-desert'],1);
 for(const id of ['tiger-stripe','ucp','multicam'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],2,id);
 assert.equal(HEADWEAR_CAMO_RECIPES.multicam.colors.length,7);
 assert.ok(headwearCamoCoverage('multicam')[5]>.02,'cream chips must be represented');
 assert.ok(headwearCamoCoverage('multicam')[6]>.02,'small dry flecks must survive');
 // UCP should exhibit numerous 1-3 texel transitions in its native tile.
 const pixels=headwearCamoIndices('ucp');
 let transitions=0;
 for(let y=0;y<32;y++)for(let x=1;x<32;x++)
  if(pixels[y*32+x]!==pixels[y*32+x-1])transitions++;
 assert.ok(transitions>100,'UCP must read as fine stair-step digital print');
});

test('operator-specific print phases are stable, change on reroll, and keep print density',()=>{
 const operators=['rook','moss','ash','vale','operator-3','operator-4'];
 for(const id of HEADWEAR_CAMO_IDS){
  const phases=operators.map(operator=>headwearCamoPlacement(operator,'headwear',id));
  assert.deepEqual(phases[0],headwearCamoPlacement('rook','headwear',id));
  assert.ok(new Set(phases.map(p=>p.offsetX+':'+p.offsetY)).size>=4,id+' squad variation');
  for(const phase of phases){
   assert.ok(Number.isInteger(phase.offsetX)&&phase.offsetX>=0&&phase.offsetX<headwearCamoSize(id));
   assert.ok(Number.isInteger(phase.offsetY)&&phase.offsetY>=0&&phase.offsetY<headwearCamoSize(id));
   if(id==='m81-woodland')
    assert.ok(headwearCamoFrontBrownFraction(phase)<=.34,
     'woodland forward panel must not be brown dominated');
  }
  const reroll=headwearCamoPlacement('rook','headwear',id,1);
  assert.notDeepEqual(phases[0],reroll,id+' reroll changes crop');
  const same=headwearCamoTexture('boonie',id,phases[0]);
  assert.equal(same,headwearCamoTexture('boonie',id,phases[0]),'cache equal phases');
  const changed=headwearCamoTexture('boonie',id,reroll);
  assert.notEqual(same,changed,'independent texture phase');
  assert.equal(changed.channel,1,'must retain fabric UV1 channel');
  assert.equal(HEADWEAR_CAMO_DENSITY[id],id==='finnish-m05'?3:
   ['ucp','tiger-stripe','multicam','flecktarn','woodland-marpat',
    'desert-marpat','erdl-lowland','polish-pantera','desert-tropentarn',
    'east-german-strichtarn','splittertarn-31','australian-dpcu','italian-vegetato',
    'scorpion-w2','cadpat-tw','british-mtp','indian-digital-2022',
    'mitchell-leaf'].includes(id)?2:
    ['russian-emr','pla-xingkong'].includes(id)?3:1);
 }
 assert.equal(nextHeadwearCamoRoll(0),1);
 assert.equal(nextHeadwearCamoRoll(4095),0);
});
test('reroll persists in wardrobe recipes and flows through live rig pose',()=>{
 const saved=readWardrobe({...initialWardrobe(),headwearCamo:'m81-woodland',headwearCamoRoll:17});
 assert.equal(saved.headwearCamoRoll,17);
 assert.equal(readWardrobe({...saved,headwearCamoRoll:-8}).headwearCamoRoll,undefined);
 assert.equal(readWardrobe({...saved,headwearCamoRoll:100000}).headwearCamoRoll,undefined);
 const rig=createOperatorRig('moss','blue');
 const {kit,wardrobe}=selectWardrobeItem(bareLabEquipment(),saved,'headwear','boonie');
 const material=rig.visualKit.wardrobeHead.headwearMaterials.boonie;
 const phase=headwearCamoPlacement('moss','headwear:boonie','m81-woodland',17);
 poseOperator(rig,pose(kit,wardrobe),0);
 assert.equal(material.map,headwearCamoTexture('boonie','m81-woodland',phase));
 poseOperator(rig,pose(kit,{...wardrobe,headwearCamoRoll:18}),0);
 assert.equal(material.map,headwearCamoTexture('boonie','m81-woodland',
  headwearCamoPlacement('moss','headwear:boonie','m81-woodland',18)));
 rig.dispose();
});
test('the Lab exposes a dedicated accessible reroll without changing the canonical artwork',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/id="headwearCamoReroll"/);
 assert.match(lab,/nextHeadwearCamoRoll/);
 assert.match(lab,/headwearCamoRoll:selected===id/);
 assert.match(lab,/headwearCamoRoll:nextHeadwearCamoRoll/);
 const coverage=headwearCamoCoverage('m81-woodland');
 assert.ok(coverage[0]>.38,'M81 needs a substantial olive background');
 assert.ok(coverage[2]>.20,'M81 must include a visible tan fourth color');
 assert.ok(coverage[3]>.14&&coverage[3]<.25,'M81 dark branches are readable but not dominant');
 assert.ok(coverage[1]<.28,'M81 brown secondary only');
});

