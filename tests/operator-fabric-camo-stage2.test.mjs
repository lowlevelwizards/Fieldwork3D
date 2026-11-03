import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {HEADWEAR_CAMO_IDS,headwearCamoSize,headwearCamoPixels,
 HEADWEAR_CAMO_DENSITY} from '../src/operator-headwear-camo.ts';
import {HEADWEAR_CAMO_ELIGIBILITY} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_POLICY,fabricCamoCompatible,fabricCamoChoices,
 FABRIC_CAMO_CHANNELS} from '../src/operator-fabric-camo-policy.ts';
import {initialWardrobe,readWardrobe,matchWardrobeUniformCamo,
 setWardrobeFabricCamo,rerollWardrobeFabricCamo,setWardrobePattern,
 resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {wardrobeFabricCamoTexture,mapGarmentBoxUV}
 from '../src/operator-fabric-camo-materials.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {makeWardrobeLook,exportWardrobeLook,importWardrobeLook}
 from '../src/operator-wardrobe-storage.ts';
import {initialRoster,freshQuickPlayRoster,serializeQuickPlayCosmetics,readRoster}
 from '../src/breach-roster.ts';

const kit=initialEquipmentLoadout(),outfit=resolvedWardrobe(initialWardrobe(),kit);
const pose=wardrobe=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:kit,wardrobe
});
test('authentic policy has exactly the frozen 30 patterns and five independently filtered fabric channels',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,30);
 assert.deepEqual(Object.keys(FABRIC_CAMO_POLICY).sort(),[...HEADWEAR_CAMO_IDS].sort());
 assert.deepEqual(FABRIC_CAMO_CHANNELS,['top','trousers','armor','gear','pack']);
 assert.equal(FABRIC_CAMO_POLICY['mitchell-leaf'].channels.length,0);
 assert.equal(fabricCamoCompatible('mitchell-leaf','top',outfit),false);
 assert.equal(fabricCamoCompatible('mitchell-leaf','pack',outfit),false);
 assert.ok(HEADWEAR_CAMO_ELIGIBILITY.ach.includes('mitchell-leaf'));
 assert.equal(fabricCamoCompatible('desert-marpat','armor',outfit),false);
 assert.equal(fabricCamoCompatible('woodland-marpat','armor',outfit),false);
 assert.equal(fabricCamoCompatible('woodland-marpat','pack',
  {...outfit,packStyle:'sling-bag'}),false);
 assert.equal(fabricCamoCompatible('woodland-marpat','pack',
  {...outfit,packStyle:'rucksack'}),true);
 assert.equal(fabricCamoCompatible('alpenflage','top',outfit),true);
 assert.equal(fabricCamoCompatible('alpenflage','top',
  {...outfit,top:'combat-shirt'}),false);
 assert.equal(fabricCamoCompatible('east-german-strichtarn','gear',
  {...outfit,rigStyle:'micro-rig'}),false);
 assert.equal(fabricCamoCompatible('east-german-strichtarn','gear',
  {...outfit,rigStyle:'field-webbing'}),true);
 assert.equal(fabricCamoCompatible('indian-digital-2022','armor',outfit),false);
 assert.equal(fabricCamoCompatible('splittertarn-31','top',outfit),true);
 assert.equal(fabricCamoCompatible('splittertarn-31','top',
  {...outfit,top:'acu-shirt'}),false);
 assert.ok(fabricCamoChoices('top',outfit).includes('m81-woodland'));
 assert.ok(!fabricCamoChoices('top',outfit).includes('mitchell-leaf'));
});
test('authored fabric cuts use immutable approved pixels and physically scaled nearest filtering',()=>{
 const before=headwearCamoPixels('m81-woodland').slice();
 const tex=wardrobeFabricCamoTexture('m81-woodland','top',{offsetX:3,offsetY:7});
 assert.equal(tex.image.width,headwearCamoSize('m81-woodland'));
 assert.deepEqual(tex.image.data,headwearCamoPixels('m81-woodland'));
 assert.deepEqual(headwearCamoPixels('m81-woodland'),before);
 assert.equal(tex.repeat.x,32*HEADWEAR_CAMO_DENSITY['m81-woodland']/headwearCamoSize('m81-woodland'));
 assert.equal(tex.magFilter,THREE.NearestFilter);
 assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
 assert.equal(tex.offset.x,3/headwearCamoSize('m81-woodland'));
 assert.equal(tex.offset.y,7/headwearCamoSize('m81-woodland'));
 assert.notEqual(wardrobeFabricCamoTexture('m81-woodland','top',{offsetX:3,offsetY:7}),
  wardrobeFabricCamoTexture('m81-woodland','trousers',{offsetX:3,offsetY:7}));
 assert.equal(wardrobeFabricCamoTexture('m81-woodland','top',{offsetX:3,offsetY:7}),tex);
 const geometry=mapGarmentBoxUV(new THREE.BoxGeometry(12,18,8),12,18,8);
 const uv=geometry.getAttribute('uv');
 assert.notDeepEqual([uv.getX(0),uv.getY(0)],[uv.getX(16),uv.getY(16)]);
 geometry.dispose();
});
test('separately seeded garment rolls survive wardrobe v1, Lab looks and Quick Play reset',()=>{
 let look={...initialWardrobe(),palette:5};
 look=setWardrobeFabricCamo(look,'top','m81-woodland',outfit);
 look=setWardrobeFabricCamo(look,'trousers','m81-woodland',outfit);
 assert.equal(look.fabricCamoRoll.top,0);
 assert.equal(look.fabricCamoRoll.trousers,0);
 look=rerollWardrobeFabricCamo(look,'top',outfit);
 assert.equal(look.fabricCamoRoll.top,1);
 assert.equal(look.fabricCamoRoll.trousers,0);
 assert.equal(readWardrobe(JSON.parse(JSON.stringify(look))).fabricCamoRoll.top,1);
 assert.equal(readWardrobe(JSON.parse(JSON.stringify(look))).palette,5);
 const stored=makeWardrobeLook('Woodland',kit,look);
 assert.equal(importWardrobeLook(exportWardrobeLook(stored)).wardrobe.fabricCamo.top,'m81-woodland');
 let roster=initialRoster();
 roster.members[0].wardrobe=look;roster.members[0].reserve=0;
 const fresh=freshQuickPlayRoster(roster);
 assert.equal(fresh.members[0].wardrobe.fabricCamo.top,'m81-woodland');
 assert.equal(fresh.members[0].wardrobe.fabricCamoRoll.top,1);
 assert.ok(fresh.members[0].reserve>0);
 const roundtrip=readRoster(serializeQuickPlayCosmetics(fresh));
 assert.equal(roundtrip.members[0].wardrobe.fabricCamo.trousers,'m81-woodland');
 const leg=setWardrobePattern(look,'top','flannel');
 assert.equal(leg.fabricCamo.top,undefined,'legacy choice clears only top override');
 assert.equal(leg.fabricCamo.trousers,'m81-woodland');
 assert.equal(leg.patterns.top,'flannel');
 assert.equal(setWardrobeFabricCamo(look,'armor','mitchell-leaf',outfit),look);
 const matching=matchWardrobeUniformCamo(initialWardrobe(),outfit,'flecktarn');
 assert.equal(matching.fabricCamo.top,'flecktarn');
 assert.equal(matching.fabricCamo.trousers,'flecktarn');
});
test('actual operator renders cloth/armor/gear/pack in selected authored maps, not rubber or headgear',()=>{
 const rig=createOperatorRig('rook','blue');
 let w=initialWardrobe();
 for(const channel of FABRIC_CAMO_CHANNELS)
  w=setWardrobeFabricCamo(w,channel,'m81-woodland',outfit);
 poseOperator(rig,pose(w),0);
 for(const [channel,material] of [
  ['top',rig.clothMaterial],['trousers',rig.trouserMaterial],
  ['armor',rig.vestMaterial],['gear',rig.gearMaterial],['pack',rig.packMaterial]
 ]){
  assert.ok(material.map?.name.includes('Fieldwork cloth '+channel+' / m81-woodland'),channel);
  assert.equal(material.color.getHex(),0xffffff,channel);
 }
 assert.ok(!rig.bootMaterial.map?.name.includes('Fieldwork cloth'));
 assert.ok(!rig.skinMaterial.map?.name.includes('Fieldwork cloth'));
 assert.ok(!rig.headClothMaterial.map?.name.includes('Fieldwork cloth'));
 assert.ok(!rig.headArmorMaterial.map?.name.includes('Fieldwork cloth'));
 const topBefore=rig.clothMaterial.map;
 const trouBefore=rig.trouserMaterial.map;
 const different=rerollWardrobeFabricCamo(w,'top',outfit);
 poseOperator(rig,pose(different),0);
 assert.notEqual(rig.clothMaterial.map,topBefore);
 assert.equal(rig.trouserMaterial.map,trouBefore);
 poseOperator(rig,pose(setWardrobeFabricCamo(different,'top','mitchell-leaf',outfit)),0);
 assert.ok(rig.clothMaterial.map?.name.includes('m81-woodland'));
 rig.dispose();
});
test('three editor contexts mount shared actual-pixel swatches; historic eligibility gates visible controls',()=>{
 for(const [name,path] of [
  ['Lab','../src/breach-operator-lab.ts'],['Campaign','../src/campaign-ui.ts'],
  ['Quick Play','../src/breach-main.ts']]){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(source,/createWardrobeFabricCamoPicker/,name);
 }
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 assert.match(html,/id="wardrobeFabricCamo"/);
 const picker=readFileSync(new URL('../src/operator-fabric-camo-picker.ts',import.meta.url),'utf8');
 assert.match(picker,/headwearCamoPixels\(id\)/);
 assert.match(picker,/fabricCamoChoices\(channel,outfit\)/);
 assert.match(picker,/matchWardrobeUniformCamo/);
 assert.match(picker,/rerollWardrobeFabricCamo/);
});
