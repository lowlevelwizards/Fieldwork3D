import test from 'node:test';
import assert from 'node:assert/strict';
import {assertIdentityEqual as assertEqual} from './helpers/identity.mjs';

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
test('forty-six independently authored 32/64px camo families use fixed opaque canonical colors',()=>{
 assertEqual(HEADWEAR_CAMO_SIZE,32);
 assertEqual(HEADWEAR_CAMO_IDS.length,62);
 const unique=new Set();
 for(const id of HEADWEAR_CAMO_IDS){
  const tile=headwearCamoPixels(id),indices=headwearCamoIndices(id);
  const recipe=HEADWEAR_CAMO_RECIPES[id];
  const coverage=headwearCamoCoverage(id);
  const native=headwearCamoSize(id);
  assert.ok(native===32||native===64,id+' permitted master size');
  assertEqual(tile.length,native*native*4,id);
  assertEqual(indices.length,native*native,id);
  assertEqual(coverage.length,recipe.colors.length,id);
  assert.ok(Math.abs(coverage.reduce((a,b)=>a+b,0)-1)<1e-10,id);
  assertEqual(recipe.targetCoverage.length,coverage.length,id);
  for(let tone=0;tone<coverage.length;tone++)
   assert.ok(Math.abs(coverage[tone]-recipe.targetCoverage[tone])<=.035,
    id+' color '+tone+' must keep measured authored color proportions');
  assert.ok(coverage.every(n=>n>.01&&n<(id==='east-german-strichtarn'?.90:.80)),
   id+' all ink tones must appear (raincloth may be mostly neutral)');
  assert.ok(recipe.colors.length>=3&&recipe.colors.length<=7,id);
  for(let i=0;i<indices.length;i++){
   assertEqual(tile[i*4+3],255,id);
   assert.ok(indices[i]<recipe.colors.length,id);
   assert.deepEqual(Array.from(tile.slice(i*4,i*4+3)),recipe.colors[indices[i]],id);
  }
  unique.add(Buffer.from(tile).toString('base64'));
 }
 assertEqual(unique.size,62,'patterns must not be color-only variations of one tile');
});
test('item compatibility is restricted, validated, and persists through outfit serialization',()=>{
 assertEqual(headwearCamoChoices('beanie').length,0);
 assertEqual(headwearCamoChoices('soviet-steel').length,0);
 assertEqual(headwearCamoChoices('bare').length,0);
 assert.deepEqual(headwearCamoChoices('high-cut-rails'),headwearCamoChoices('high-cut'));
 assertEqual(resolvedHeadwearCamo('ach','tiger-stripe'),null);
 assertEqual(resolvedHeadwearCamo('boonie','tiger-stripe'),'tiger-stripe');
 for(const id of HEADWEAR_CAMO_IDS){
  const saved=readWardrobe({...initialWardrobe(),headwearCamo:id});
  assertEqual(saved.headwearCamo,id);
 }
 assertEqual(readWardrobe({...initialWardrobe(),headwearCamo:'unknown'}).headwearCamo,undefined);
});
test('printed camouflage uses a separate 128px UV1 atlas; 1:1 finish remains unchanged',()=>{
 for(const model of ['boonie','ach','high-cut','patrol-cap','pasgt']){
  const id=headwearCamoChoices(model)[0],texture=headwearCamoTexture(model,id);
  assertEqual(texture.image.width,128);
  assertEqual(texture.image.height,128);
  assertEqual(texture.magFilter,THREE.NearestFilter);
  assertEqual(texture.channel,1,'camo must use independent sewn fabric UV1');
  assertEqual(texture.colorSpace,THREE.SRGBColorSpace);
  assertEqual(texture.wrapS,THREE.ClampToEdgeWrapping);
  assertEqual(texture,headwearCamoTexture(model,id),'cache by model and camo');
  assertEqual(headwearDetailTexture(model).image.width,64,'structural pixels remain 1:1');
  assert.notEqual(texture,headwearDetailTexture(model));
  assertEqual(headwearFinishTexture(model),headwearFinishTexture(model));
  const pixels=texture.image.data;
  const rgb=new Set();
  for(let i=0;i<pixels.length;i+=4){
   assertEqual(pixels[i+3],255);
   rgb.add(pixels.slice(i,i+3).join(','));
  }
  assert.ok(rgb.size>=3,model+' must visibly contain multiple colored fields');
 }
});
test('live pose swaps camo and solid without animation restoring gray or mutating geometry',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const model of ['patrol-cap','boonie','ach','high-cut','pasgt']){
  const {kit,wardrobe}=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'headwear',model);
  const material=rig.visualKit.wardrobeHead.headwearMaterials[model];
  const finish=material.roughnessMap;
  const geo=rig.visualKit.wardrobeHead.headwear[model].children[0].children[0].geometry;
  assert.ok(geo.getAttribute('uv1'),'cloth UVs must survive visual geometry consolidation');
  assertEqual(geo.getAttribute('uv1').count,geo.getAttribute('uv').count);
  for(const id of headwearCamoChoices(model)){
   const selection={...wardrobe,headwearCamo:id};
   poseOperator(rig,pose(kit,selection),0);
   assertEqual(material.map,headwearCamoTexture(model,id,
    headwearCamoPlacement('rook','headwear:'+model,id,0)));
   assertEqual(material.color.getHex(),0xffffff,model+':'+id);
   assertEqual(material.vertexColors,true,
    'pattern-neutral geometry AO remains enabled on camouflage helmets');
   poseOperator(rig,pose(kit,selection),0);
   assertEqual(material.map,headwearCamoTexture(model,id,
    headwearCamoPlacement('rook','headwear:'+model,id,0)),'repeated pose reuses atlas');
   assertEqual(material.roughnessMap,finish,'physical map preserved');
   assertEqual(rig.visualKit.wardrobeHead.headwear[model].children[0].children[0].geometry,geo,
    'no silhouette mutation');
  }
  const solidId=headwearColorChoices(model)[0];
  const solid={...wardrobe,headwearCamo:undefined,headwearColor:solidId};
  poseOperator(rig,pose(kit,solid),0);
  assertEqual(material.map,headwearDetailTexture(model),'solid construction atlas restored');
  assertEqual(material.vertexColors,true,'solid headwear restores structural vertex shading');
  assertEqual(material.color.getHex(),HEADWEAR_SOLID_COLORS[solidId].hex);
 }
 rig.dispose();
});
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
 assertEqual(HEADWEAR_CAMO_DENSITY['m81-woodland'],1);
 assertEqual(HEADWEAR_CAMO_DENSITY['three-color-desert'],1);
 for(const id of ['tiger-stripe','ucp','multicam'])
  assertEqual(HEADWEAR_CAMO_DENSITY[id],2,id);
 assertEqual(HEADWEAR_CAMO_RECIPES.multicam.colors.length,7);
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
  assertEqual(same,headwearCamoTexture('boonie',id,phases[0]),'cache equal phases');
  const changed=headwearCamoTexture('boonie',id,reroll);
  assert.notEqual(same,changed,'independent texture phase');
  assertEqual(changed.channel,1,'must retain fabric UV1 channel');
  assertEqual(HEADWEAR_CAMO_DENSITY[id],id==='finnish-m05'?3:
   ['ucp','tiger-stripe','multicam','flecktarn','woodland-marpat',
    'desert-marpat','erdl-lowland','polish-pantera','desert-tropentarn',
    'east-german-strichtarn','splittertarn-31','australian-dpcu','italian-vegetato',
    'scorpion-w2','cadpat-tw','british-mtp','indian-digital-2022',
    'mitchell-leaf'].includes(id)?2:
    ['russian-emr','pla-xingkong'].includes(id)?3:1);
 }
 assertEqual(nextHeadwearCamoRoll(0),1);
 assertEqual(nextHeadwearCamoRoll(4095),0);
});
test('reroll persists in wardrobe recipes and flows through live rig pose',()=>{
 const saved=readWardrobe({...initialWardrobe(),headwearCamo:'m81-woodland',headwearCamoRoll:17});
 assertEqual(saved.headwearCamoRoll,17);
 assertEqual(readWardrobe({...saved,headwearCamoRoll:-8}).headwearCamoRoll,undefined);
 assertEqual(readWardrobe({...saved,headwearCamoRoll:100000}).headwearCamoRoll,undefined);
 const rig=createOperatorRig('moss','blue');
 const {kit,wardrobe}=selectWardrobeItem(bareLabEquipment(),saved,'headwear','boonie');
 const material=rig.visualKit.wardrobeHead.headwearMaterials.boonie;
 const phase=headwearCamoPlacement('moss','headwear:boonie','m81-woodland',17);
 poseOperator(rig,pose(kit,wardrobe),0);
 assertEqual(material.map,headwearCamoTexture('boonie','m81-woodland',phase));
 poseOperator(rig,pose(kit,{...wardrobe,headwearCamoRoll:18}),0);
 assertEqual(material.map,headwearCamoTexture('boonie','m81-woodland',
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

test('seven authored auditions are independently structured, correctly dense, and compatible',()=>{
 const newIds=['flecktarn','woodland-dpm','swedish-m90','six-color-desert',
  'woodland-marpat','alpenflage','desert-marpat'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(5,12),newIds);
 for(const id of newIds){
  assert.ok(headwearCamoChoices('patrol-cap').includes(id));
  assert.ok(headwearCamoChoices('boonie').includes(id));
  assertEqual(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.notDeepEqual(headwearCamoIndices(id),headwearCamoIndices('m81-woodland'));
 }
 for(const id of ['flecktarn','woodland-marpat','desert-marpat'])
  assertEqual(HEADWEAR_CAMO_DENSITY[id],2,'fine printed fabric must be two pixels/unit');
 for(const id of ['woodland-dpm','swedish-m90','six-color-desert','alpenflage'])
  assertEqual(HEADWEAR_CAMO_DENSITY[id],1,'broad motifs must remain one pixel/unit');
 assertEqual(headwearCamoChoices('pasgt').includes('six-color-desert'),true);
 assertEqual(headwearCamoChoices('pasgt').includes('woodland-marpat'),false);
 assertEqual(headwearCamoChoices('ach').includes('alpenflage'),false);
 assertEqual(headwearCamoChoices('high-cut').includes('woodland-dpm'),false);
 assertEqual(headwearCamoChoices('beanie').length,0);
});
test('3C palettes give M81 and DPM distinct identities without recoloring woodland MARPAT',()=>{
 const m81=HEADWEAR_CAMO_RECIPES['m81-woodland'].colors;
 const dpm=HEADWEAR_CAMO_RECIPES['woodland-dpm'].colors;
 const marpat=HEADWEAR_CAMO_RECIPES['woodland-marpat'].colors;
 assert.deepEqual(marpat,[[94,111,77],[138,121,90],[64,83,66],[46,54,44]],
  'MARPAT retains the earthy green/brown palette that already read well');
 assert.deepEqual(m81,[[75,96,74],[100,82,70],[147,137,115],[37,43,40]],
  'M81 must be muted, with brown/green/tan separated by dark ink');
 assert.deepEqual(dpm,[[175,155,105],[87,118,73],[118,85,60],[48,55,39]],
  'DPM warm khaki/green/earth-brown does not borrow MARPAT wash');
 assert.ok(m81[0][1]<dpm[1][1],'M81 olive should be more subdued than DPM');
 assert.ok(m81[2][0]<dpm[0][0],'M81 tan should be more muted than DPM');
 assert.ok(m81[3][0]<dpm[3][0],'M81 charcoal should read as black-branch ink');
 assert.notDeepEqual(m81,dpm);
 assert.notDeepEqual(dpm,marpat);
 const dpmCoverage=headwearCamoCoverage('woodland-dpm');
 assert.ok(dpmCoverage[0]>.20&&dpmCoverage[1]>.25&&dpmCoverage[2]>.25);
 assert.ok(dpmCoverage[3]<.20,'DPM charcoal branches must not dominate');
 assert.ok(HEADWEAR_CAMO_RECIPES['woodland-dpm'].motifs.length>=20,
  'DPM requires distinct thin brushes, khaki negative space and green fingers');
 const chips=HEADWEAR_CAMO_RECIPES['six-color-desert'].colors;
 assert.deepEqual(chips[5],[46,54,44],
  'restore original six-color desert ink; fix darkening in material rather than repainting');
 assert.ok(headwearCamoCoverage('six-color-desert')[4]>.01);
 assert.ok(headwearCamoCoverage('six-color-desert')[5]>.01);
 assert.ok(headwearCamoCoverage('alpenflage')[4]>=.10);
 assert.ok(headwearCamoCoverage('alpenflage')[4]<=.21);
 assert.ok(headwearCamoCoverage('desert-marpat')[0]>.40);
});
test('3C Flecktarn and both MARPATs carry fine dense motifs compared with UCP',()=>{
 const transitions=id=>{
  const pixels=headwearCamoIndices(id);let changes=0;
  const size=headwearCamoSize(id);
  for(let y=0;y<size;y++)for(let x=1;x<size;x++)
   if(pixels[y*size+x]!==pixels[y*size+x-1])changes++;
  return changes;
 };
 const ucp=transitions('ucp');
 assert.ok(ucp>200,'the existing UCP digital density is our reference');
 assert.ok(transitions('flecktarn')>ucp*1.35,'Flecktarn should be denser than UCP');
 assert.ok(transitions('woodland-marpat')>ucp,'woodland MARPAT should be at least as dense as UCP');
 assert.ok(transitions('desert-marpat')>ucp,'desert MARPAT should be at least as dense as UCP');
 assert.ok(transitions('woodland-dpm')/headwearCamoSize('woodland-dpm')>
  transitions('m81-woodland')/headwearCamoSize('m81-woodland'),
  'DPM must have its own more elongated edge language');
 assertEqual(HEADWEAR_CAMO_DENSITY.flecktarn,2);
 assertEqual(HEADWEAR_CAMO_DENSITY['woodland-marpat'],2);
 assertEqual(HEADWEAR_CAMO_DENSITY['desert-marpat'],2);
 const code=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(code,/FLECKTARN_CLUSTERS/);
 assert.match(code,/FLECKTARN_SATELLITES/);
 assert.match(code,/applyMarpatFragments/);
 assert.match(code,/applyFlecktarnSpeckle/);
});

test('3B fabric cut and material channels are consistent for all new prints',()=>{
 const ids=HEADWEAR_CAMO_IDS.slice(5);
 for(const id of ids){
  const first=headwearCamoPlacement('new-operator','headwear:boonie',id,1);
  const again=headwearCamoPlacement('new-operator','headwear:boonie',id,1);
  assert.deepEqual(first,again);
  const tex=headwearCamoTexture('boonie',id,first);
  assertEqual(tex.channel,1);
  assertEqual(tex.image.width,128);
  assertEqual(tex.image.height,128);
  assertEqual(tex.magFilter,THREE.NearestFilter);
  assertEqual(tex,headwearCamoTexture('boonie',id,first));
 }
 const code=readFileSync(new URL('../src/operator-headwear-materials.ts',import.meta.url),'utf8');
 assert.match(code,/MAX_CACHED_CAMO_CUTS=192/);
 assert.match(code,/evicted\?\.dispose\(\)/);
});

test('3D camo atlas contains authored RGB verbatim while solid structural maps stay intact',()=>{
 for(const camo of ['m81-woodland','woodland-dpm','flecktarn','six-color-desert']){
  const tex=headwearCamoTexture('boonie',camo),rgba=tex.image.data;
  const art=headwearCamoPixels(camo),density=HEADWEAR_CAMO_DENSITY[camo];
  for(let region=0;region<4;region++)for(const y of [0,12,24,40,63])
   for(const x of [0,8,20,36,63]){
    const px=density===1?Math.floor(x/2):x;
    const py=density===1?Math.floor(y/2):y;
    const size=headwearCamoSize(camo);
    const source=((py%size)*size+(px%size))*4;
    const dest=((Math.floor(region/2)*64+y)*128+(region%2)*64+x)*4;
    assert.deepEqual(Array.from(rgba.slice(dest,dest+3)),
     Array.from(art.slice(source,source+3)),camo+' material may not darken ink');
   }
 }
 const solid=headwearDetailTexture('boonie');
 assertEqual(solid.image.width,64);
 assert.ok(solid.image.data.some((n,i)=>i%4===0&&n<250),
  'solids retain their construction-tinted material atlas');
});
test('Flecktarn emphasizes fewer broader base fields with overlaid fine droplets',()=>{
 const r=HEADWEAR_CAMO_RECIPES.flecktarn;
 const macro=r.motifs.slice(0,4);
 assertEqual(macro.length,4);
 assert.deepEqual(macro.map(([ink])=>ink),[1,1,2,2]);
 for(const [tone,polygon] of macro){
  assert.ok(tone===1||tone===2);
  const xs=polygon.filter((_,i)=>i%2===0),ys=polygon.filter((_,i)=>i%2===1);
  assert.ok(Math.max(...xs)-Math.min(...xs)>=18,'wide base fleck field');
  assert.ok(Math.max(...ys)-Math.min(...ys)>=11,'tall base fleck field');
 }
 const coverage=headwearCamoCoverage('flecktarn');
 assert.ok(coverage[0]>.1,'visible base olive field');
 assert.ok(coverage[1]>.2,'deep forest mass still legible');
 assert.ok(coverage[2]>.2,'underlying tan fields remain recognizable');
 assert.ok(coverage[3]+coverage[4]>.34,'retain dense Flecktarn rust and ink droplets');
});

test('4A expanded library preserves native tile scale, print compatibility and palette audit',()=>{
 const six=['erdl-lowland','finnish-m05','polish-pantera','russian-flora',
  'rhodesian-brushstroke','desert-tropentarn'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(12,18),six);
 assertEqual(headwearCamoSize('m81-woodland'),64);
 for(const id of HEADWEAR_CAMO_IDS.slice(0,18).filter(id=>!['m81-woodland','desert-tropentarn'].includes(id)))
  assertEqual(headwearCamoSize(id),32,id);
 assertEqual(headwearCamoSize('desert-tropentarn'),64);
 const oldColors=new Set(HEADWEAR_CAMO_IDS.slice(0,12).flatMap(id=>
  HEADWEAR_CAMO_RECIPES[id].colors.map(c=>c.join(','))));
 const uniqueSignatures=new Set();
 let addedColors=0;
 for(const id of six){
  assert.ok(headwearCamoChoices('boonie').includes(id),id);
  assert.ok(headwearCamoChoices('patrol-cap').includes(id),id);
  assert.ok(headwearCamoCoverage(id).every(v=>v>.015),id+' all pigment roles visible');
  assertEqual(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  const signature=HEADWEAR_CAMO_RECIPES[id].colors.map(c=>c.join(',')).join('|');
  assert.ok(!uniqueSignatures.has(signature),id+' must have an independent palette');
  uniqueSignatures.add(signature);
  if(HEADWEAR_CAMO_RECIPES[id].colors.some(c=>!oldColors.has(c.join(','))))addedColors++;
 }
 assertEqual(addedColors,6,'all six prints merit new pigments rather than forced reuse');
 const allColors=new Set(HEADWEAR_CAMO_IDS.flatMap(id=>
  HEADWEAR_CAMO_RECIPES[id].colors.map(c=>c.join(','))));
 assert.ok(allColors.size>=42,'palette expansion is now allowed where historically justified');

 for(const id of ['erdl-lowland','polish-pantera','desert-tropentarn'])
  assertEqual(HEADWEAR_CAMO_DENSITY[id],2);
 assertEqual(HEADWEAR_CAMO_DENSITY['finnish-m05'],3,'Finnish M05 must have smaller organic motifs');
 for(const id of ['russian-flora','rhodesian-brushstroke'])
  assertEqual(HEADWEAR_CAMO_DENSITY[id],1);
});
test('M81 extended organic master and fine Chocolate Chip flakes retain the correct print scale',()=>{
 assert.ok(HEADWEAR_CAMO_RECIPES['m81-woodland'].motifs.length>=24);
 assertEqual(headwearCamoPixels('m81-woodland').length,64*64*4);
 assertEqual(headwearCamoPixels('six-color-desert').length,32*32*4);
 const chocolate=HEADWEAR_CAMO_RECIPES['six-color-desert'];
 const chips=chocolate.motifs.filter(([tone])=>tone===5);
 assert.ok(chips.length>=10,'chips are numerous small marks, not a handful of rings');
 for(const [,pts] of chips){
  const xs=pts.filter((_,i)=>i%2===0);
  const ys=pts.filter((_,i)=>i%2===1);
  assert.ok(Math.max(...xs)-Math.min(...xs)<=4,'dark chip footprint stays compact');
  assert.ok(Math.max(...ys)-Math.min(...ys)<=4,'dark chip footprint stays compact');
 }
 const tex=headwearCamoTexture('boonie','m81-woodland',
  {offsetX:52,offsetY:46});
 assertEqual(tex.channel,1);
 assertEqual(tex.image.width,128);
 const art=headwearCamoPixels('m81-woodland');
 // At 1x print density, UV1 region art x samples are x/2; phase can
 // cross the old 32px boundary without repeating the first half of the art.
 for(const [x,y] of [[0,0],[12,16],[32,20],[60,60]]){
  const sx=(Math.floor(x/2)+52)%64,sy=(Math.floor(y/2)+46)%64;
  const src=(sy*64+sx)*4,dst=(y*128+x)*4;
  assert.deepEqual(Array.from(tex.image.data.slice(dst,dst+3)),
   Array.from(art.slice(src,src+3)));
 }
});

test('4B Finnish M05 prints genuinely smaller, with distinct patterns/pigments',()=>{
 const id='finnish-m05',density=HEADWEAR_CAMO_DENSITY[id];
 assertEqual(density,3);
 const texture=headwearCamoTexture('boonie',id,{offsetX:0,offsetY:0});
 const art=headwearCamoPixels(id),rgba=texture.image.data;
 for(const [x,y] of [[3,7],[12,13],[25,9],[40,60]]){
  const sx=Math.floor(x*3/2)%32,sy=Math.floor(y*3/2)%32;
  const source=(sy*32+sx)*4,dest=(y*128+x)*4;
  assert.deepEqual(Array.from(rgba.slice(dest,dest+3)),
   Array.from(art.slice(source,source+3)),'3x sampler must actually shrink motifs');
 }
 const arts=HEADWEAR_CAMO_IDS.slice(12,18).map(id=>headwearCamoPixels(id));
 assertEqual(new Set(arts.map(a=>Buffer.from(a).toString('base64'))).size,6);
 const src=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(src,/apply4BDetail/);
 assert.match(src,/camoGrain/);
 assert.match(src,/camoLattice/);
});

test('4C M81 crown and forward wall remain four-tone across seeded rerolls',()=>{
 const phases=[];
 for(let i=0;i<15;i++){
  const p=headwearCamoPlacement('rook','headwear:boonie','m81-woodland',i);
  phases.push(p);
  const cover=headwearCamoM81CrownCoverage(p);
  assert.ok(cover[3]>=.085,'dark forks must be visible on crown, reroll '+i);
  assert.ok(cover[0]<=.54,'green cannot become a solid panel, reroll '+i);
  assert.ok(cover[2]>=.13,'tan must break up the face of the crown, reroll '+i);
  assert.ok(cover[1]>=.10,'brown must appear somewhere in crown, reroll '+i);
  assert.ok(headwearCamoFrontBrownFraction(p)<=.34,'brown-front limit reroll '+i);
 }
 assert.ok(new Set(phases.map(p=>p.offsetX+':'+p.offsetY)).size>=6);
});
test('4C desert German spot pattern is 64px, three colors and real Flecktarn-family micro rosettes',()=>{
 const id='desert-tropentarn';
 const recipe=HEADWEAR_CAMO_RECIPES[id];
 assertEqual(headwearCamoSize(id),64);
 assertEqual(recipe.colors.length,3,'German desert flecks use sand, brown and green');
 assert.ok(headwearCamoCoverage(id)[0]>.50,'sand must remain negative space');
 assert.ok(headwearCamoCoverage(id)[1]>.12,'brown droplet clusters must register');
 assert.ok(headwearCamoCoverage(id)[2]>.08,'dark olive groupings must register');
 const placement={offsetX:41,offsetY:50},texture=headwearCamoTexture('boonie',id,placement);
 const art=headwearCamoPixels(id);
 for(const [x,y] of [[0,0],[12,12],[32,47],[63,63]]){
  const src=((y+50)%64*64+(x+41)%64)*4;
  const dst=(y*128+x)*4;
  assert.deepEqual(Array.from(texture.image.data.slice(dst,dst+3)),
   Array.from(art.slice(src,src+3)));
 }
 const code=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(code,/Wüstentarn inherits Flecktarn rosettes/);
});
test('4C audited motif families remain distinctive and reference anchored',()=>{
 const recipes=HEADWEAR_CAMO_RECIPES;
 const palettes=HEADWEAR_CAMO_IDS.map(id=>recipes[id].colors.map(c=>c.join(',')).join('/'));
 assert.ok(new Set(palettes).size>=29,'only intentional color similarities may recur');
 assertEqual(HEADWEAR_CAMO_DENSITY['finnish-m05'],3);
 assertEqual(HEADWEAR_CAMO_DENSITY['swedish-m90'],1);
 assertEqual(HEADWEAR_CAMO_DENSITY['woodland-dpm'],1);
 assertEqual(HEADWEAR_CAMO_DENSITY['russian-flora'],1);
 assert.ok(recipes.alpenflage.colors.some(c=>c[0]>140&&c[1]<90),
  'Alpenflage retains its distinct red');
 assert.ok(recipes['woodland-marpat'].colors.length>=4);
 assert.ok(recipes['desert-marpat'].colors.length>=4);
 assert.ok(recipes['six-color-desert'].colors.length>=6);
 const dpmMotifs=recipes['woodland-dpm'].motifs.length;
 assert.ok(dpmMotifs>=20,'British DPM maintains fine branching brushes');
 assert.ok(recipes['m81-woodland'].motifs.length>=30,
  'M81 four-tone connected artwork needs multiple black forks');
});

test('5A adds twelve recognizable global pattern families and authentic print densities',()=>{
 const newIds=['belgian-jigsaw','east-german-strichtarn','mitchell-leaf','splittertarn-31',
  'australian-dpcu','italian-vegetato','scorpion-w2','russian-emr',
  'pla-xingkong','cadpat-tw','british-mtp','indian-digital-2022'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(18,30),newIds);
 const signatures=new Set();
 for(const id of newIds){
  const entry=CAMO_CATALOG[id],recipe=HEADWEAR_CAMO_RECIPES[id];
  assert.ok(entry?.terrain&&entry?.style&&entry?.origin,id);
  assert.ok(recipe.motifs.length>=3||id==='east-german-strichtarn',
   id+' must have independent macro fields or an intentional sparse raincloth base');
  assert.ok(recipe.description.length>35);
  assert.ok(headwearCamoChoices('patrol-cap').includes(id));
  assert.ok(headwearCamoChoices('boonie').includes(id));
  assertEqual(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  const signature=recipe.colors.map(c=>c.join(',')).join('/')+'|'+
   Buffer.from(headwearCamoIndices(id)).toString('base64');
  assert.ok(!signatures.has(signature),id+' must be distinguishable');
  signatures.add(signature);
  const phase=headwearCamoPlacement('moss','headwear:boonie',id,13);
  const size=headwearCamoSize(id);
  assert.ok(phase.offsetX>=0&&phase.offsetX<size);
  assert.ok(phase.offsetY>=0&&phase.offsetY<size);
  const tex=headwearCamoTexture('boonie',id,phase);
  assertEqual(tex.channel,1);
  assertEqual(tex.magFilter,THREE.NearestFilter);
  assertEqual(tex.image.width,128);
 }
 assertEqual(CAMO_ORIGINS.includes('India'),true);
 assertEqual(CAMO_CATALOG['russian-emr'].style,'digital');
 assertEqual(CAMO_CATALOG['east-german-strichtarn'].style,'raindrop');
 assertEqual(CAMO_CATALOG['splittertarn-31'].style,'geometric');
 assertEqual(CAMO_CATALOG['belgian-jigsaw'].origin,'Belgium');
 assertEqual(CAMO_CATALOG['british-mtp'].terrain,'multi');
 assertEqual(HEADWEAR_CAMO_DENSITY['russian-emr'],3);
 assertEqual(HEADWEAR_CAMO_DENSITY['pla-xingkong'],3);
 assertEqual(headwearCamoSize('scorpion-w2'),64);
 assertEqual(headwearCamoSize('cadpat-tw'),64);
});
test('5A mobile browser provides grouped searchable filtering, favorites and recent choices',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['camoTerrainFilter','camoStyleFilter','camoOriginFilter',
  'camoSearchFilter','camoCompatibleFilter','camoFavoriteFilter',
  'camoBrowseSummary','camoRecentRow','camoBrowseEmpty'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(lab,/filterCamoCatalog/);
 assert.match(lab,/camoFavorites/);
 assert.match(lab,/camoRecents/);
 assert.match(lab,/camoCompareDetails\.open/);
 const initial={terrain:'all',style:'all',origin:'Canada',text:'',
  onlyCompatible:false,onlyFavorites:false};
 assert.deepEqual(filterCamoCatalog(initial,[],new Set()),['cadpat-tw']);
 const favorites=filterCamoCatalog({terrain:'woodland',style:'digital',origin:'all',
  text:'',onlyCompatible:true,onlyFavorites:true},headwearCamoChoices('boonie'),
  new Set(['woodland-marpat','cadpat-tw']));
 assert.deepEqual(favorites,['woodland-marpat','cadpat-tw']);
 assert.deepEqual(filterCamoCatalog({terrain:'arid',style:'raindrop',origin:'all',
  text:'',onlyCompatible:false,onlyFavorites:false},[],new Set()),[]);
 const search=filterCamoCatalog({terrain:'all',style:'all',origin:'all',text:'Scorpion',
  onlyCompatible:true,onlyFavorites:false},headwearCamoChoices('boonie'),new Set());
 assert.deepEqual(search,['scorpion-w2']);
});
test('5A historical patterns retain independently recognizable palette structure',()=>{
 const p=HEADWEAR_CAMO_RECIPES;
 assert.ok(headwearCamoCoverage('east-german-strichtarn')[0]>.54);
 assertEqual(p['east-german-strichtarn'].colors.length,3);
 assertEqual(p['russian-emr'].colors.length,4);
 assertEqual(p['cadpat-tw'].colors.length,5);
 assertEqual(p['indian-digital-2022'].colors.length,5);
 assertEqual(p['scorpion-w2'].colors.length,7);
 assertEqual(p['british-mtp'].colors.length,7);
 assert.notDeepEqual(p['scorpion-w2'].colors,p['british-mtp'].colors);
 assert.notDeepEqual(p['scorpion-w2'].motifs,p['british-mtp'].motifs);
 const code=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(code,/Very thin 1px straight vertical rain-stria overprint/);
 assert.match(code,/narrow 1px vertical red-brown rain dashes/);
 assert.match(code,/fractal pixels/);
 assert.match(code,/Original stepped olive\/earth\/buff artwork/);
});

test('5B all twelve master patterns retain distinct art, meaningful ink roles and original registrations',()=>{
 const batch=HEADWEAR_CAMO_IDS.slice(18,30);
 assertEqual(batch.length,12);
 const swatches=new Set();
 const colors=new Set();
 for(const id of batch){
  const recipe=HEADWEAR_CAMO_RECIPES[id],source=headwearCamoPixels(id);
  const signature=Buffer.from(source).toString('base64');
  assert.ok(!swatches.has(signature),id+' must not be a recolor');
  swatches.add(signature);
  for(const rgb of recipe.colors)colors.add(rgb.join(','));
  assert.ok(headwearCamoCoverage(id).filter(c=>c>.045).length>=2,
   id+' needs two visually meaningful pigment fields');
 }
 assertEqual(colors.size,49,'5B must preserve consolidated 49-color twelve-print palette');
 assertEqual(HEADWEAR_CAMO_DENSITY['mitchell-leaf'],2,'Mitchell leaf forms must read on the worn crown');
 assertEqual(headwearCamoSize('east-german-strichtarn'),64,'Strichtarn needs a varied fine 64px repeat');
 assertEqual(HEADWEAR_CAMO_DENSITY['east-german-strichtarn'],2);
 assertEqual(HEADWEAR_CAMO_DENSITY['russian-emr'],3);
 assertEqual(HEADWEAR_CAMO_DENSITY['pla-xingkong'],3);
});
test('5B Belgian Jigsaw rerolls retain contrasting puzzle pieces on actual 64px UV1 crown',()=>{
 const scores=[];
 for(let roll=0;roll<16;roll++){
  const phase=headwearCamoPlacement('moss','headwear:boonie','belgian-jigsaw',roll);
  const cover=headwearCamoAppliedCoverage('belgian-jigsaw',phase);
  assertEqual(cover.length,5);
  assert.ok(cover[0]>.07,'mustard needs to show on cap variation '+roll);
  assert.ok(cover[1]>.05,'burgundy puzzle piece should appear '+roll);
  assert.ok(cover[2]>.06,'blue-green puzzle piece should appear '+roll);
  assert.ok(cover[3]>.025,'dark hooked outlines should appear '+roll);
  assert.ok(Math.max(...cover)<.64,'no enormous single-color slab '+roll);
  scores.push(phase.offsetX+':'+phase.offsetY);
 }
 assert.ok(new Set(scores).size>=6,'reroll must keep varied fabric placement');
});
test('5B applied 3D print coverage matches sampled canonical art and existing UV1 atlas',()=>{
 for(const id of HEADWEAR_CAMO_IDS.slice(18,30)){
  const phase=headwearCamoPlacement('rook','headwear:boonie',id,7);
  const atlas=headwearCamoTexture('boonie',id,phase),source=headwearCamoPixels(id);
  const size=headwearCamoSize(id),density=HEADWEAR_CAMO_DENSITY[id];
  const cover=headwearCamoAppliedCoverage(id,phase);
  assert.ok(Math.abs(cover.reduce((a,b)=>a+b,0)-1)<1e-8);
  for(const [x,y] of [[2,3],[15,44],[41,8],[62,62]]){
   const sx=(Math.floor(x*density/2)+phase.offsetX)%size;
   const sy=(Math.floor(y*density/2)+phase.offsetY)%size;
   const a=(sy*size+sx)*4,d=(y*128+x)*4;
   assert.deepEqual(Array.from(atlas.image.data.slice(d,d+3)),
    Array.from(source.slice(a,a+3)),id+' exact applied color');
  }
 }
});
test('5B identity checks distinguish raindrop, leaf, splinter, digital and modern transition groups',()=>{
 const codes=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(codes,/Belgian Jigsaw rerolls|belgianJigsawCutScore/);
 assert.match(codes,/puzzle topology/);
 assert.match(codes,/lobed leaves/);
 assert.match(codes,/Staggered jellybean|Staggered jellybean/i);
 assert.match(codes,/sharp/);
 const j=HEADWEAR_CAMO_RECIPES['belgian-jigsaw'];
 assertEqual(j.colors.length,5);
 assertEqual(HEADWEAR_CAMO_RECIPES['east-german-strichtarn'].colors.length,3);
 assert.ok(headwearCamoCoverage('east-german-strichtarn')[0]>.70);
 assert.ok(headwearCamoCoverage('australian-dpcu')[0]<.50,
  'Auscam base may not become a near-solid pale crown');
 assert.ok(headwearCamoCoverage('russian-emr')[2]<.24,'EMR brown remains secondary');
 assert.ok(headwearCamoCoverage('cadpat-tw')[1]<.28,'CADPAT accent should not dominate');
 assert.notDeepEqual(HEADWEAR_CAMO_RECIPES['scorpion-w2'].motifs,
  HEADWEAR_CAMO_RECIPES['british-mtp'].motifs);
});
