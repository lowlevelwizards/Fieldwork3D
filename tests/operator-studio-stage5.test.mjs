import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWardrobe,readWardrobe,setWardrobeFabricSolid,
 setWardrobeFabricCamo,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {CAMO_CUFF_DEFAULTS,GARMENT_SOLID_COLORS,
 resolvedCuffSolid,solidChoicesFor} from '../src/operator-garment-color-policy.ts';
import {fabricCamoChoices} from '../src/operator-fabric-camo-policy.ts';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('solid finish choices are independently saved and old wardrobe v1 still loads',()=>{
 const kit=initialEquipmentLoadout();
 const old=initialWardrobe();
 assert.deepEqual(readWardrobe(old),old);
 const outfit=resolvedWardrobe(old,kit);
 const camos=fabricCamoChoices('top',outfit);
 assert.ok(camos.includes('m81-woodland'));
 const camouflaged=setWardrobeFabricCamo(old,'top','m81-woodland',outfit);
 const solid=setWardrobeFabricSolid(camouflaged,'top','olive-drab');
 assert.equal(solid.fabricCamo.top,undefined);
 assert.equal(solid.fabricSolids.top,'olive-drab');
 assert.equal(readWardrobe(JSON.parse(JSON.stringify(solid))).fabricSolids.top,'olive-drab');
 assert.equal(setWardrobeFabricSolid(solid,'armor','off-white'),solid,
  'invalid armor solid must not override fabric');
 const withManual=readWardrobe({...solid,cuffSolid:'ranger-green',knitSolid:'coyote'});
 assert.equal(withManual.cuffSolid,'ranger-green');
 assert.equal(withManual.knitSolid,'coyote');
 assert.ok(solidChoicesFor('trousers').includes('sand'));
 assert.ok(!solidChoicesFor('armor').includes('off-white'));
});
test('auto cuffs follow functional camouflage families, manual choice takes precedence',()=>{
 assert.equal(CAMO_CUFF_DEFAULTS['m81-woodland'],'olive-drab');
 assert.equal(CAMO_CUFF_DEFAULTS['woodland-dpm'],'olive-drab');
 assert.equal(CAMO_CUFF_DEFAULTS['russian-emr'],'forest-green');
 assert.equal(CAMO_CUFF_DEFAULTS['three-color-desert'],'sand');
 assert.equal(CAMO_CUFF_DEFAULTS['desert-marpat'],'coyote');
 assert.equal(CAMO_CUFF_DEFAULTS.ucp,'foliage');
 assert.equal(CAMO_CUFF_DEFAULTS.multicam,'coyote');
 assert.equal(resolvedCuffSolid({print:'m81-woodland'}),'olive-drab');
 assert.equal(resolvedCuffSolid({print:'three-color-desert'}),'sand');
 assert.equal(resolvedCuffSolid({print:'m81-woodland',override:'tan'}),'tan');
 assert.equal(resolvedCuffSolid({solid:'ranger-green'}),'ranger-green');
 for(const color of Object.values(CAMO_CUFF_DEFAULTS))
  assert.ok(Object.hasOwn(GARMENT_SOLID_COLORS,color));
});
test('studio preserves the game page and separates the visual editor from animation lab',()=>{
 const index=read('../index.html');
 const code=read('../src/breach-main.ts');
 const page=read('../operator-studio.html');
 const studio=read('../src/operator-studio.ts');
 const css=read('../src/operator-studio.css');
 const vite=read('../vite.config.ts');
 assert.match(index,/id="openOperatorStudio"/);
 assert.match(code,/function openOperatorStudio\(/);
 assert.match(code,/msg.type!=='fw-studio-commit'/);
 assert.match(studio,/type:'fw-studio-commit'/);
 assert.match(code,/setCampaignWardrobe\(campaign,msg.id,msg.wardrobe\)/);
 assert.match(code,/setRosterWardrobe\(persistentRoster,msg.id,msg.wardrobe\)/);
 assert.match(code,/event.origin!==location.origin/);
 assert.match(page,/id="studioCanvas"/);
 assert.match(page,/id="studioMaterials"/);
 assert.match(studio,/solidChoicesFor/);
 assert.match(studio,/setWardrobeFabricSolid/);
 assert.match(studio,/new OperatorAppearanceGrid/);
 assert.match(studio,/dirty.has\(selected\)/);
 assert.match(studio,/CAMOUFLAGE/);
 assert.match(css,/\.studio-stage/);
 assert.match(vite,/operatorStudio: 'operator-studio.html'/);
 assert.ok(!page.includes('id="timeline"'),'normal appearance editor must not have animation transport');
});
