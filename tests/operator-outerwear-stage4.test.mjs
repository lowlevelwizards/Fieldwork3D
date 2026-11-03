import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {readWardrobe,initialWardrobe,resolvedWardrobe,
 wardrobeItemsForSlot,TROUSER_HEMS,SLEEVE_STATES}
 from '../src/operator-wardrobe-data.ts';
import {NEW_UPPER_CUTS,UPPER_CUT_PROFILES}
 from '../src/operator-new-upper-garments.ts';
import {FIELD_TROUSER_PROFILES,FIELD_TROUSER_CUTS}
 from '../src/operator-field-trouser-prototypes.ts';
import {garmentColorValues,topColorwayChoices,
 gorkaSpecialtyTexture,gorkaSpecialtyPixels}
 from '../src/operator-upper-colorways.ts';
import {fabricCamoCompatible,fabricCamoChoices,FABRIC_CAMO_POLICY}
 from '../src/operator-fabric-camo-policy.ts';
import {HEADWEAR_CAMO_IDS} from '../src/operator-headwear-camo.ts';
import {WARDROBE_RECIPES,applyWardrobeRecipe}
 from '../src/operator-wardrobe-recipes.ts';

const kit=initialEquipmentLoadout();
const pose=(w,extra={})=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,equipment:kit,wardrobe:w,...extra
});
const outfit=(top,trousers='bdu-trousers',extra={})=>({
 ...initialWardrobe(),styles:{top,trousers},...extra
});
const read=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');
const shown=(groups)=>groups.every(g=>g.visible);
test('all three new upper designs and actual matching mountain trousers exist in the catalog',()=>{
 assert.deepEqual(NEW_UPPER_CUTS,['combat-shirt','smock-jacket','gorka-jacket']);
 assert.ok(FIELD_TROUSER_CUTS.includes('gorka-trousers'));
 for(const id of NEW_UPPER_CUTS)
  assert.ok(wardrobeItemsForSlot('top').some(x=>x.id===id),id);
 assert.ok(wardrobeItemsForSlot('trousers').some(x=>
  x.id==='gorka-trousers'));
 assert.ok(TROUSER_HEMS.includes('cuffed'));
 assert.deepEqual(SLEEVE_STATES,['unrolled','cuffed','rolled']);
 const p=UPPER_CUT_PROFILES;
 assert.ok(p['smock-jacket'].rings.at(-1).y<
  p['combat-shirt'].rings.at(-1).y-2,'smock must have a long outer hem');
 assert.ok(p['gorka-jacket'].rings[1].side>
  p['combat-shirt'].rings[1].side+.4,'mountain suit retains a looser shoulder');
 assert.ok(p['gorka-jacket'].rings[1].side<
  p['combat-shirt'].rings[1].side+1.50,'not an armored juggernaut');
 assert.ok(p['smock-jacket'].rings[1].side<8.3,'smock keeps restrained outerwear volume');
 assert.ok(FIELD_TROUSER_PROFILES['gorka-trousers'].thigh[2][1]>
  FIELD_TROUSER_PROFILES['acu-trousers'].thigh[2][1]+.35);
});
test('cargo pockets are on the outer ±Z side seam, not the front (+X)',()=>{
 const p=read('../src/operator-field-trouser-prototypes.ts');
 assert.match(p,/const pocket=outwardLimbPocket\(p.thigh\[2\]\[1\]/);
 assert.match(p,/part\(upper,textile,pocket.x,pocket.y,pocket.z/);
 assert.match(p,/part\(lower,cloth,calf.x,calf.y,calf.z/);
 for(const id of FIELD_TROUSER_CUTS){
  const v=FIELD_TROUSER_PROFILES[id];
  assert.ok(v.cargo[0]<.65,'shallow outward thickness');
  assert.ok(v.cargo[2]>2.5,'wide pouch lies along front-to-back Z');
  assert.ok(v.cargo[1]*11.25>v.cargo[0]*5,
   'pouch is vertically prominent rather than a flat plate');
  assert.ok(v.bloused.at(-1)[0]<.3,'raised hem is above ankle');
  assert.ok(v.bloused.at(-1)[1]<v.unbloused.at(-1)[1]-.65);
  assert.ok(v.cuffed.at(-1)[1]>v.unbloused.at(-1)[1]+.15);
 }
});
test('three new top families follow full existing articulation and survive changing poses',()=>{
 const r=createOperatorRig('rook','blue'),fit=r.garmentFitAnchors;
 const original={
  knees:fit['knee-left'].offset.clone(),
  shoulders:fit['shoulder-left'].offset.clone(),
  footGeo:r.feet.map(x=>x.shoe.geometry),
  head:r.visualKit.wardrobeHead
 };
 for(const top of NEW_UPPER_CUTS){
  for(const phase of [
   {posture:'stand'}, {posture:'crouch'},
   {velocity:20,stride:15,seconds:.3},
   {aiming:true}, {down:true,downProgress:.7}
  ]){
   const w=outfit(top,top==='gorka-jacket'?
    'gorka-trousers':'acu-trousers');
   poseOperator(r,pose(w,phase),.25);
   const body=r.visualKit.newUpper.cuts[top];
   assert.equal(body.torso.visible,true,top);
   assert.ok(shown(body.upper)&&shown(body.lower));
   for(const other of NEW_UPPER_CUTS.filter(x=>x!==top))
    assert.equal(r.visualKit.newUpper.cuts[other].torso.visible,false);
   assert.equal(r.visualKit.wardrobeHead,original.head);
   assert.ok(fit['knee-left'].offset.equals(original.knees));
   assert.ok(fit['shoulder-left'].offset.equals(original.shoulders));
   assert.deepEqual(r.feet.map(x=>x.shoe.geometry),original.footGeo);
   if(top==='gorka-jacket')
    assert.ok(shown(r.visualKit.fieldTrousers['gorka-trousers'].thigh));
  }
 }
 r.dispose();
});
test('combat shirt: clean knit body, original-pattern woven sleeves and high wrist roll',()=>{
 const r=createOperatorRig('rook','blue');
 for(const sleeveState of SLEEVE_STATES){
  poseOperator(r,pose(outfit('combat-shirt','acu-trousers',{
   sleeveState,fabricCamo:{top:'multicam'}})),0);
  const model=r.visualKit.newUpper.cuts['combat-shirt'];
  assert.ok(model.torso.visible);
  assert.equal(shown(model.lower),sleeveState==='unrolled');
  assert.equal(shown(model.cuffedLower),sleeveState==='cuffed');
  assert.equal(shown(model.rolledUpper),sleeveState==='rolled');
  assert.equal(r.arms[0].lower.material===r.skinMaterial,
   sleeveState!=='unrolled');
  assert.notEqual(r.visualKit.newUpper.combatKnit,
   r.clothMaterial,'the torso must not be mapped by the sleeve print');
  assert.match(r.clothMaterial.map.name,/multicam/);
  assert.ok(r.visualKit.newUpper.combatKnit.map.name!==
   r.clothMaterial.map.name,'plain knit remains independent');
 }
 r.dispose();
});
test('bloused vs bulky cuffed trouser and raised sleeve cuff are REAL geometry',()=>{
 const r=createOperatorRig('rook','blue');
 for(const hem of TROUSER_HEMS){
  poseOperator(r,pose(outfit('bdu-shirt','bdu-trousers',{
   trouserHem:hem,sleeveState:'cuffed'})),0);
  const t=r.visualKit.fieldTrousers['bdu-trousers'];
  assert.equal(shown(t.bloused),hem==='bloused');
  assert.equal(shown(t.cuffed),hem==='cuffed');
  assert.equal(shown(t.unbloused),hem==='unbloused');
  assert.equal(r.feet[0].lower.material===r.bootMaterial,hem==='bloused');
  const b=r.visualKit.fieldBlouses['bdu-shirt'];
  assert.ok(shown(b.cuffed)&&shown(b.cuffedLower));
  assert.ok(b.lower.every(x=>!x.visible));
  assert.equal(r.arms[0].lower.material,r.skinMaterial);
 }
 r.dispose();
});
test('Gorka contextual colorways and two handcrafted summer/autumn masters remain garment-only',()=>{
 assert.ok(topColorwayChoices('gorka-jacket').some(x=>x[0]==='ss-leto'));
 assert.ok(topColorwayChoices('gorka-jacket').some(x=>x[0]==='ss-autumn'));
 assert.deepEqual(topColorwayChoices('bdu-shirt'),[]);
 const summer=gorkaSpecialtyPixels('ss-leto'),
  autumn=gorkaSpecialtyPixels('ss-autumn');
 assert.equal(summer.length,64*64*4);
 assert.equal(autumn.length,summer.length);
 assert.notDeepEqual(summer,autumn);
 assert.equal(gorkaSpecialtyTexture('ss-leto').name,'Fieldwork Gorka-only ss-leto');
 const r=createOperatorRig('rook','blue');
 for(const id of ['ss-leto','ss-autumn']){
  const w=outfit('gorka-jacket','gorka-trousers',{topColorway:id});
  poseOperator(r,pose(w),0);
  assert.match(r.visualKit.newUpper.mountainPanel.map.name,new RegExp(id));
  assert.match(r.visualKit.newUpper.mountainLegPanel.map.name,new RegExp(id));
  assert.notEqual(r.visualKit.newUpper.mountainCanvas.map,
   r.visualKit.newUpper.mountainPanel.map);
  assert.equal(r.visualKit.newUpper.mountainCanvas.map.name.includes('Gorka-only'),false);
 }
 const solid=garmentColorValues('gorka-jacket','olive-brown');
 assert.notEqual(solid.gorkaBase,solid.gorkaPanel);
 r.dispose();
});
test('Alpenflage allowed on smock, Splittertarn completely deferred, issued prints untouched',()=>{
 const smock=resolvedWardrobe(outfit('smock-jacket'),kit);
 const gorka=resolvedWardrobe(outfit('gorka-jacket','gorka-trousers'),kit);
 assert.equal(fabricCamoCompatible('alpenflage','top',smock),true);
 assert.equal(fabricCamoCompatible('alpenflage','top',gorka),false);
 assert.ok(fabricCamoChoices('top',smock).includes('woodland-dpm'));
 assert.ok(fabricCamoChoices('top',smock).includes('british-mtp'));
 assert.equal(fabricCamoCompatible('russian-emr','trousers',gorka),true);
 assert.deepEqual(FABRIC_CAMO_POLICY['splittertarn-31'].channels,[]);
 assert.ok(HEADWEAR_CAMO_IDS.includes('splittertarn-31'),
  'archive original artwork without exposing the deferred print');
 const source=read('../src/operator-headwear-picker.ts');
 assert.match(source,/id!=='splittertarn-31'/);
 const w=readWardrobe({version:1,styles:{top:'smock-jacket'},
  headwearCamo:'splittertarn-31',
  fabricCamo:{top:'splittertarn-31'}});
 assert.equal(w.headwearCamo,undefined);
 assert.equal(w.fabricCamo?.top,undefined);
});
test('appearance controls and presets expose matching real garment families',()=>{
 const html=read('../operator-lab.html');
 const lab=read('../src/breach-operator-lab.ts');
 const camp=read('../src/campaign-ui.ts');
 const quick=read('../src/breach-main.ts');
 assert.ok(html.includes('id="wardrobeTopColorway"'));
 assert.ok(html.includes('value="cuffed">CUFFED · BULKY'));
 for(const src of [lab,camp,quick])
  assert.match(src,/topColorwayChoices/);
 const ids=new Set(WARDROBE_RECIPES.map(x=>x.id));
 for(const id of ['combat-shirt','windproof-smock','mountain-gorka',
  'gorka-ss-leto','gorka-ss-autumn'])assert.ok(ids.has(id),id);
 for(const preset of WARDROBE_RECIPES){
  const applied=applyWardrobeRecipe(preset);
  const o=resolvedWardrobe(applied.wardrobe,applied.kit);
  assert.ok(wardrobeItemsForSlot('top').some(x=>x.id===o.top));
  if(o.top==='gorka-jacket')assert.equal(o.trousers,'gorka-trousers');
 }
});
