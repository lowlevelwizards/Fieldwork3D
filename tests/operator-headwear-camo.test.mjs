import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_SIZE,HEADWEAR_CAMO_DENSITY,
 headwearCamoChoices,headwearCamoIndices,headwearCamoCoverage,
 headwearCamoPixels,resolvedHeadwearCamo,headwearCamoPlacement,
 headwearCamoFrontBrownFraction,nextHeadwearCamoRoll} from '../src/operator-headwear-camo.ts';
import {headwearCamoTexture,headwearDetailTexture,headwearFinishTexture}
 from '../src/operator-headwear-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
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
test('twelve deliberate 32px camo families use fixed opaque canonical colors',()=>{
 assert.equal(HEADWEAR_CAMO_SIZE,32);
 assert.equal(HEADWEAR_CAMO_IDS.length,12);
 const unique=new Set();
 for(const id of HEADWEAR_CAMO_IDS){
  const tile=headwearCamoPixels(id),indices=headwearCamoIndices(id);
  const recipe=HEADWEAR_CAMO_RECIPES[id];
  const coverage=headwearCamoCoverage(id);
  assert.equal(tile.length,32*32*4,id);
  assert.equal(indices.length,1024,id);
  assert.equal(coverage.length,recipe.colors.length,id);
  assert.ok(Math.abs(coverage.reduce((a,b)=>a+b,0)-1)<1e-10,id);
  assert.equal(recipe.targetCoverage.length,coverage.length,id);
  for(let tone=0;tone<coverage.length;tone++)
   assert.ok(Math.abs(coverage[tone]-recipe.targetCoverage[tone])<=.04,
    id+' color '+tone+' must keep authored color proportions');
  assert.ok(coverage.every(n=>n>.01&&n<.80),id+' every authored color must appear');
  assert.ok(recipe.colors.length>=3&&recipe.colors.length<=7,id);
  for(let i=0;i<1024;i++){
   assert.equal(tile[i*4+3],255,id);
   assert.ok(indices[i]<recipe.colors.length,id);
   assert.deepEqual(Array.from(tile.slice(i*4,i*4+3)),recipe.colors[indices[i]],id);
  }
  unique.add(Buffer.from(tile).toString('base64'));
 }
 assert.equal(unique.size,12,'patterns must not be color-only variations of one tile');
});
test('item compatibility is restricted, validated, and persists through outfit serialization',()=>{
 assert.equal(headwearCamoChoices('beanie').length,0);
 assert.equal(headwearCamoChoices('soviet-steel').length,0);
 assert.equal(headwearCamoChoices('bare').length,0);
 assert.deepEqual(headwearCamoChoices('high-cut-rails'),headwearCamoChoices('high-cut'));
 assert.equal(resolvedHeadwearCamo('ach','tiger-stripe'),null);
 assert.equal(resolvedHeadwearCamo('boonie','tiger-stripe'),'tiger-stripe');
 for(const id of HEADWEAR_CAMO_IDS){
  const saved=readWardrobe({...initialWardrobe(),headwearCamo:id});
  assert.equal(saved.headwearCamo,id);
 }
 assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:'unknown'}).headwearCamo,undefined);
});
test('printed camouflage uses a separate 128px UV1 atlas; 1:1 finish remains unchanged',()=>{
 for(const model of ['boonie','ach','high-cut','patrol-cap','pasgt']){
  const id=headwearCamoChoices(model)[0],texture=headwearCamoTexture(model,id);
  assert.equal(texture.image.width,128);
  assert.equal(texture.image.height,128);
  assert.equal(texture.magFilter,THREE.NearestFilter);
  assert.equal(texture.channel,1,'camo must use independent sewn fabric UV1');
  assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
  assert.equal(texture.wrapS,THREE.ClampToEdgeWrapping);
  assert.equal(texture,headwearCamoTexture(model,id),'cache by model and camo');
  assert.equal(headwearDetailTexture(model).image.width,64,'structural pixels remain 1:1');
  assert.notEqual(texture,headwearDetailTexture(model));
  assert.equal(headwearFinishTexture(model),headwearFinishTexture(model));
  const pixels=texture.image.data;
  const rgb=new Set();
  for(let i=0;i<pixels.length;i+=4){
   assert.equal(pixels[i+3],255);
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
  assert.equal(geo.getAttribute('uv1').count,geo.getAttribute('uv').count);
  for(const id of headwearCamoChoices(model)){
   const selection={...wardrobe,headwearCamo:id};
   poseOperator(rig,pose(kit,selection),0);
   assert.equal(material.map,headwearCamoTexture(model,id,
    headwearCamoPlacement('rook','headwear:'+model,id,0)));
   assert.equal(material.color.getHex(),0xffffff,model+':'+id);
   assert.equal(material.vertexColors,false,
    'camo must not be darkened a second time by construction vertex shading');
   poseOperator(rig,pose(kit,selection),0);
   assert.equal(material.map,headwearCamoTexture(model,id,
    headwearCamoPlacement('rook','headwear:'+model,id,0)),'repeated pose reuses atlas');
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
 assert.match(html,/COMPARE ALL 12/);
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
   assert.ok(Number.isInteger(phase.offsetX)&&phase.offsetX>=0&&phase.offsetX<32);
   assert.ok(Number.isInteger(phase.offsetY)&&phase.offsetY>=0&&phase.offsetY<32);
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
  assert.equal(HEADWEAR_CAMO_DENSITY[id],['ucp','tiger-stripe','multicam','flecktarn','woodland-marpat','desert-marpat'].includes(id)?2:1);
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
 assert.ok(coverage[0]+coverage[2]>.65,'M81 must be green-forward');
 assert.ok(coverage[1]<.28,'M81 brown secondary only');
});

test('seven authored auditions are independently structured, correctly dense, and compatible',()=>{
 const newIds=['flecktarn','woodland-dpm','swedish-m90','six-color-desert',
  'woodland-marpat','alpenflage','desert-marpat'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(5),newIds);
 for(const id of newIds){
  assert.ok(headwearCamoChoices('patrol-cap').includes(id));
  assert.ok(headwearCamoChoices('boonie').includes(id));
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.notDeepEqual(headwearCamoIndices(id),headwearCamoIndices('m81-woodland'));
 }
 for(const id of ['flecktarn','woodland-marpat','desert-marpat'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],2,'fine printed fabric must be two pixels/unit');
 for(const id of ['woodland-dpm','swedish-m90','six-color-desert','alpenflage'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],1,'broad motifs must remain one pixel/unit');
 assert.equal(headwearCamoChoices('pasgt').includes('six-color-desert'),true);
 assert.equal(headwearCamoChoices('pasgt').includes('woodland-marpat'),false);
 assert.equal(headwearCamoChoices('ach').includes('alpenflage'),false);
 assert.equal(headwearCamoChoices('high-cut').includes('woodland-dpm'),false);
 assert.equal(headwearCamoChoices('beanie').length,0);
});
test('3C palettes give M81 and DPM distinct identities without recoloring woodland MARPAT',()=>{
 const m81=HEADWEAR_CAMO_RECIPES['m81-woodland'].colors;
 const dpm=HEADWEAR_CAMO_RECIPES['woodland-dpm'].colors;
 const marpat=HEADWEAR_CAMO_RECIPES['woodland-marpat'].colors;
 assert.deepEqual(marpat,[[94,111,77],[138,121,90],[64,83,66],[46,54,44]],
  'MARPAT retains the earthy green/brown palette that already read well');
 assert.deepEqual(m81,[[87,118,73],[118,85,60],[64,83,66],[48,55,39]],
  'M81 returns to DPM-family muted woodland greens instead of lime');
 assert.deepEqual(dpm,[[175,155,105],[87,118,73],[118,85,60],[48,55,39]],
  'DPM warm khaki/green/earth-brown does not borrow MARPAT wash');
 assert.deepEqual(m81[0],dpm[1],'M81 and DPM share the approved olive fabric ink');
 assert.deepEqual(m81[1],dpm[2],'M81 and DPM share the approved brown fabric ink');
 assert.deepEqual(m81[3],dpm[3],'M81 and DPM share the approved dark fabric ink');
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
  for(let y=0;y<32;y++)for(let x=1;x<32;x++)
   if(pixels[y*32+x]!==pixels[y*32+x-1])changes++;
  return changes;
 };
 const ucp=transitions('ucp');
 assert.ok(ucp>200,'the existing UCP digital density is our reference');
 assert.ok(transitions('flecktarn')>ucp*1.35,'Flecktarn should be denser than UCP');
 assert.ok(transitions('woodland-marpat')>ucp,'woodland MARPAT should be at least as dense as UCP');
 assert.ok(transitions('desert-marpat')>ucp,'desert MARPAT should be at least as dense as UCP');
 assert.ok(transitions('woodland-dpm')>transitions('m81-woodland'),
  'DPM must have its own more elongated edge language');
 assert.equal(HEADWEAR_CAMO_DENSITY.flecktarn,2);
 assert.equal(HEADWEAR_CAMO_DENSITY['woodland-marpat'],2);
 assert.equal(HEADWEAR_CAMO_DENSITY['desert-marpat'],2);
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
  assert.equal(tex.channel,1);
  assert.equal(tex.image.width,128);
  assert.equal(tex.image.height,128);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex,headwearCamoTexture('boonie',id,first));
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
    const source=((py%32)*32+(px%32))*4;
    const dest=((Math.floor(region/2)*64+y)*128+(region%2)*64+x)*4;
    assert.deepEqual(Array.from(rgba.slice(dest,dest+3)),
     Array.from(art.slice(source,source+3)),camo+' material may not darken ink');
   }
 }
 const solid=headwearDetailTexture('boonie');
 assert.equal(solid.image.width,64);
 assert.ok(solid.image.data.some((n,i)=>i%4===0&&n<250),
  'solids retain their construction-tinted material atlas');
});
test('Flecktarn emphasizes fewer broader base fields with overlaid fine droplets',()=>{
 const r=HEADWEAR_CAMO_RECIPES.flecktarn;
 const macro=r.motifs.slice(0,4);
 assert.equal(macro.length,4);
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
