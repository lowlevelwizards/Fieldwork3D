import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEADWEAR_CAMO_IDS,headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {CAMO_CATALOG} from '../src/operator-headwear-camo-catalog.ts';
import {FABRIC_CAMO_POLICY,fabricCamoChoices} from '../src/operator-fabric-camo-policy.ts';
import {validArmorSolid,validRigSolid} from '../src/operator-rig-authenticity-policy.ts';
import {GARMENT_SOLID_COLORS} from '../src/operator-garment-color-policy.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {browseCamos,camoFamily,camoSearchMatches,camoEnvironments,camoSortEra,
 colorLightness,sortGarmentSolids,sortHeadwearSolids,
 defaultCamoBrowserState} from '../src/operator-material-browser.ts';
import {coordinateOutfit,suggestOutfitEquipmentSolids}
 from '../src/operator-material-coordination.ts';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const outfit={top:'bdu-shirt',trousers:'bdu-trousers',armorStyle:'plate-jpc',
 rigStyle:'micro-rig',packStyle:'day-pack'};
test('all authored camouflage IDs have metadata and keep original compatibility policies',()=>{
 assert.ok(HEADWEAR_CAMO_IDS.length>=50);
 for(const id of HEADWEAR_CAMO_IDS){
  assert.ok(CAMO_CATALOG[id],id+' metadata missing');
  assert.ok(FABRIC_CAMO_POLICY[id],id+' compatibility missing');
  assert.equal(camoSortEra(id),FABRIC_CAMO_POLICY[id].period);
 }
 assert.deepEqual(browseCamos(headwearCamoChoices('beanie')),[]);
 assert.ok(!browseCamos(HEADWEAR_CAMO_IDS).includes('splittertarn-31'));
 assert.ok(!browseCamos(fabricCamoChoices('armor',outfit)).includes('splittertarn-31'));
});
test('search supports labels, documented aliases, origins and family',()=>{
 assert.ok(camoSearchMatches('scorpion-w2','OCP'));
 assert.ok(camoSearchMatches('six-color-desert','chocolate chip'));
 assert.ok(camoSearchMatches('desert-night','DNC'));
 assert.ok(camoSearchMatches('polish-pantera','Wz.93'));
 assert.ok(camoSearchMatches('british-mtp','United Kingdom')===false);
 assert.ok(camoSearchMatches('british-mtp','Britain'));
 assert.ok(camoSearchMatches('multicam-alpine','MultiCam'));
 assert.equal(camoFamily('multicam-tropic'),'MultiCam');
 assert.equal(camoFamily('pencott-badlands'),'Pencott');
 assert.equal(camoFamily('desert-marpat'),'MARPAT');
});
test('browse filters never widen eligible patterns',()=>{
 const allowed=['multicam','scorpion-w2','m81-woodland','desert-marpat'];
 const filtered=browseCamos(allowed,{state:{environment:'arid',
  sort:'alphabetical'}});
 assert.ok(filtered.length>=1);
 assert.ok(filtered.every(x=>allowed.includes(x)));
 assert.deepEqual(browseCamos(allowed,{state:{search:'no-such-pattern'}}),[]);
 assert.ok(camoEnvironments('multicam-alpine').includes('winter'));
 assert.ok(camoEnvironments('pencott-metropolis').includes('urban'));
});
test('smart sort prioritizes selected, favorites, recents, then related prints',()=>{
 const arr=['multicam','m81-woodland','scorpion-w2','tiger-stripe'];
 const ordered=browseCamos(arr,{active:'m81-woodland',reference:'multicam',
  prefs:{favorites:['scorpion-w2'],recents:['multicam']}});
 assert.deepEqual(ordered.slice(0,3),['m81-woodland','scorpion-w2','multicam']);
 assert.deepEqual(browseCamos(arr,{state:{sort:'alphabetical'}}),
  ['m81-woodland','multicam','scorpion-w2','tiger-stripe']);
 assert.equal(defaultCamoBrowserState().sort,'smart');
});
test('solid colors use stable perceptual lightness with recommended shades first',()=>{
 assert.ok(colorLightness(0xffffff)>colorLightness(0x222222));
 const colors=Object.keys(GARMENT_SOLID_COLORS);
 const sorted=sortGarmentSolids(colors,['coyote']);
 assert.equal(sorted[0],'coyote');
 assert.equal(new Set(sorted).size,colors.length);
 assert.ok(sorted.indexOf('forest-green')<sorted.indexOf('sand'));
 const helmets=sortHeadwearSolids(['black','navy','olive-drab','desert-tan'],'navy');
 assert.equal(helmets[0],'navy');
 assert.equal(new Set(helmets).size,4);
});
test('coordinated outfit only applies manufactured, eligible equipment finishes',()=>{
 const w=initialWardrobe();
 w.fabricCamo={top:'multicam',gear:'m81-woodland'};
 w.fabricSolids={armor:'coyote'};
 const suggested=suggestOutfitEquipmentSolids(w,outfit,'coordinated');
 assert.equal(suggested.length,3);
 for(const {channel,color} of suggested){
  if(channel==='armor')assert.ok(validArmorSolid(outfit.armorStyle,color));
  if(channel==='gear')assert.ok(validRigSolid(outfit.rigStyle,color));
 }
 const conservative=coordinateOutfit(w,outfit,{profile:'coordinated',scope:'unset'});
 assert.equal(conservative.fabricCamo.gear,'m81-woodland');
 assert.equal(conservative.fabricSolids.armor,'coyote');
 assert.ok(conservative.fabricSolids.pack);
 const applied=coordinateOutfit(w,outfit,{profile:'coordinated',scope:'replace'});
 assert.equal(applied.fabricCamo.gear,undefined);
 assert.ok(validRigSolid(outfit.rigStyle,applied.fabricSolids.gear));
 assert.equal(w.fabricCamo.gear,'m81-woodland','original outfit remains unchanged');
});
test('headgear print matching is opt-in and respects compatibility',()=>{
 const w=initialWardrobe();
 w.fabricCamo={top:'m81-woodland'};
 const match=coordinateOutfit(w,outfit,{profile:'coordinated',scope:'unset',
  headwear:'ach',matchHeadwearPrint:true});
 assert.equal(match.headwearCamo,'m81-woodland');
 const reject=coordinateOutfit(w,outfit,{profile:'coordinated',scope:'unset',
  headwear:'beanie',matchHeadwearPrint:true});
 assert.equal(reject.headwearCamo,undefined);
});
test('Studio, Campaign, Quick Play, and Lab are wired to shared browser',()=>{
 const studio=file('src/operator-studio.ts');
 const headwear=file('src/operator-headwear-picker.ts');
 const fabric=file('src/operator-fabric-camo-picker.ts');
 const lab=file('src/breach-operator-lab.ts');
 for(const source of [studio,headwear,fabric,lab])
  assert.match(source,/browseCamos/);
 for(const source of [studio,headwear,fabric])
  assert.match(source,/createCamoBrowseControls/);
 assert.match(studio,/sortGarmentSolids\(values\)/);
 assert.match(studio,/coordinateOutfit\(current\(\),outfit/);
 assert.match(headwear,/sortHeadwearSolids/);
 assert.match(fabric,/recordCamoRecent\(id\)/);
 assert.match(lab,/camoSearchMatches/);
 assert.match(file('src/operator-material-browser-ui.ts'),/CAMO_SORT_OPTIONS/);
 assert.match(file('src/operator-material-browser-ui.ts'),/CAMO_ENVIRONMENT_OPTIONS/);
});
