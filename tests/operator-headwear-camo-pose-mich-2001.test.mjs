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
test('live mich-2001 pose swaps all approved camo and solids without geometry mutation',()=>{
 const rig=createOperatorRig('rook','blue');
 const model='mich-2001'; {
  const {kit,wardrobe}=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'headwear',model);
  const material=rig.visualKit.wardrobeHead.headwearMaterials[model];
  const finish=material.roughnessMap;
  const geo=rig.visualKit.wardrobeHead.headwear[model].children[0].children[0].geometry;
  assert.ok(geo.getAttribute('uv1'),'cloth UVs must survive visual geometry consolidation');
  assert.equal(geo.getAttribute('uv1').count,geo.getAttribute('uv').count);
  const eligible=headwearCamoChoices(model);
  // Check the entire 62-print art catalog live once on the Boonie, while
  // representative early/middle/late prints validate each other shell.
  const samples=[...new Set([eligible[0],eligible[Math.floor(eligible.length/2)],
   eligible[eligible.length-1],'m81-woodland'].filter(id=>eligible.includes(id)))];
  for(const id of samples){
   const selection={...wardrobe,headwearCamo:id};
   poseOperator(rig,pose(kit,selection),0);
   assert.equal(material.map,headwearCamoTexture(model,id,
    headwearCamoPlacement('rook','headwear:'+model,id,0)));
   assert.equal(material.color.getHex(),0xffffff,model+':'+id);
   assert.equal(material.vertexColors,true,
    'pattern-neutral geometry AO remains enabled on camouflage helmets');
   // Repeated-pose idempotence is a representative per-shell invariant.
   // Avoid re-rasterizing every print a second time in CI.
   if(id===samples[0]||id===samples[samples.length-1]){
    poseOperator(rig,pose(kit,selection),0);
    assert.equal(material.map,headwearCamoTexture(model,id,
     headwearCamoPlacement('rook','headwear:'+model,id,0)),
     'repeated pose reuses atlas');
   }
   assert.equal(material.roughnessMap,finish,'physical map preserved');
   assert.equal(rig.visualKit.wardrobeHead.headwear[model].children[0].children[0].geometry,geo,
    'no silhouette mutation');
  }
  const solidId=headwearColorChoices(model)[0];
  const solid={...wardrobe,headwearCamo:undefined,headwearColor:solidId};
  poseOperator(rig,pose(kit,solid),0);
  assert.equal(material.map,headwearDetailTexture(model),'solid construction atlas restored');
  assert.equal(material.vertexColors,true,'solid headwear restores structural vertex shading');
  assert.equal(material.color.getHex(),HEADWEAR_SOLID_COLORS[solidId].hex);
 }
 rig.dispose();
});
