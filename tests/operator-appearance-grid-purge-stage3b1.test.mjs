import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {readWardrobe,initialWardrobe,WARDROBE_SLOTS,
 wardrobeItemsForSlot,setWardrobeStyle,resolvedWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {activeAppearanceItems,appearanceItemAvailable,
 APPEARANCE_GROUP_LABELS}
 from '../src/operator-appearance-grid.ts';
import {WARDROBE_RECIPES,applyWardrobeRecipe}
 from '../src/operator-wardrobe-recipes.ts';
import {BLOUSE_CUT_PROFILE} from '../src/operator-field-blouse-prototypes.ts';
import {HEADWEAR_CAMO_IDS} from '../src/operator-headwear-camo.ts';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('all obsolete garment options are actually gone from the authoritative catalog',()=>{
 assert.deepEqual(wardrobeItemsForSlot('top').map(x=>x.id),
  ['bdu-shirt','acu-shirt','combat-shirt','smock-jacket','gorka-jacket']);
 assert.deepEqual(wardrobeItemsForSlot('trousers').map(x=>x.id),
  ['bdu-trousers','acu-trousers','gorka-trousers']);
 assert.deepEqual(wardrobeItemsForSlot('footwear').map(x=>x.id),
  ['bare-feet','field-boots']);
 assert.deepEqual(wardrobeItemsForSlot('gloves').map(x=>x.id),
  ['gloves-none','gloves-field']);
 assert.deepEqual(wardrobeItemsForSlot('knees').map(x=>x.id),
  ['knee-none','knee-hard']);
 for(const id of ['field-jacket','t-shirt','softshell',
  'pcu-shell','light-shirt','flannel','jeans','field-trousers',
  'softshell-trousers','sneakers','hiking-shoes']){
  assert.ok(!['top','trousers','footwear'].some(slot=>
   wardrobeItemsForSlot(slot).some(x=>x.id===id)),id);
 }
 const w=setWardrobeStyle(initialWardrobe(),'top','t-shirt');
 assert.ok(!Object.hasOwn(w.styles,'top'),'deleted style cannot be selected');
 assert.equal(resolvedWardrobe(initialWardrobe(),initialEquipmentLoadout()).top,'bdu-shirt');
 assert.equal(HEADWEAR_CAMO_IDS.length,54,'expanded approved camo catalog');
 assert.ok(wardrobeItemsForSlot('headwear').some(x=>x.id==='ach'),
  'approved headwear remains');
});
test('no legacy palette, procedural pattern or compatibility migration survives parsing',()=>{
 assert.equal(existsSync(new URL('../src/operator-wardrobe-patterns.ts',import.meta.url)),false);
 const value=readWardrobe({version:1,patterns:{top:'woodland'},
  palette:7,styles:{top:'flannel',trousers:'jeans',
   headwear:'ach',footwear:'sneakers'},
  headwearColor:'olive-drab',headwearCamo:'m81-woodland'});
 assert.deepEqual(Object.keys(value).filter(x=>x==='patterns'||x==='palette'),[]);
 assert.equal(value.styles.top,undefined);
 assert.equal(value.styles.trousers,undefined);
 assert.equal(value.styles.footwear,undefined);
 assert.equal(value.styles.headwear,'ach');
 assert.equal(value.headwearCamo,'m81-woodland');
 assert.equal(value.headwearColor,'olive-drab');
 assert.equal(source('../src/breach-operator-rig.ts').includes('wardrobePatternTexture'),false);
 assert.equal(source('../src/campaign-ui.ts').includes('WARDROBE_PATTERNS'),false);
 assert.equal(source('../src/breach-main.ts').includes('WARDROBE_PATTERNS'),false);
});
test('new presets use exclusively existing cuts and original approved prints',()=>{
 assert.ok(WARDROBE_RECIPES.length>=4);
 for(const recipe of WARDROBE_RECIPES){
  for(const [slot,id] of Object.entries(recipe.styles))
   assert.ok(wardrobeItemsForSlot(slot).some(x=>x.id===id),
    recipe.id+' references deleted '+slot+':'+id);
  const applied=applyWardrobeRecipe(recipe);
  assert.ok(['bdu-shirt','acu-shirt','combat-shirt','smock-jacket','gorka-jacket'].includes(
   resolvedWardrobe(applied.wardrobe,applied.kit).top),recipe.id);
  if(recipe.topCamo)assert.equal(applied.wardrobe.fabricCamo?.top,recipe.topCamo);
  assert.ok(!('patterns' in recipe));
  assert.ok(!('palette' in recipe));
 }
});
test('3D item browser uses live rig and bounded lazy shared WebGL thumbnail capture',()=>{
 const script=source('../src/operator-appearance-grid.ts');
 const lab=source('../src/breach-operator-lab.ts');
 const html=source('../operator-lab.html');
 assert.match(script,/createOperatorRig\(/);
 assert.match(script,/poseOperator\(/);
 assert.match(script,/new THREE\.WebGLRenderTarget\(/);
 assert.match(script,/readRenderTargetPixels\(/);
 assert.match(script,/renderer\.setRenderTarget\(oldTarget\)/);
 assert.match(script,/this\.token!==token/);
 assert.match(script,/this\.cache\.size>=90/);
 assert.ok(!script.includes('new THREE.WebGLRenderer('));
 assert.ok(html.includes('id="appearanceItemBrowser"'));
 assert.ok(!html.includes('data-wardrobe-slot='));
 assert.ok(!html.includes('data-wardrobe-pattern='));
 assert.ok(!html.includes('id="headwearReviewButtons"'));
 assert.ok(lab.includes('new OperatorAppearanceGrid('));
 for(const slot of WARDROBE_SLOTS){
  assert.equal(typeof APPEARANCE_GROUP_LABELS[slot],'string');
  assert.ok(activeAppearanceItems(slot).length>0,slot);
 }
 assert.ok(appearanceItemAvailable(initialEquipmentLoadout(),
  initialWardrobe(),'top','acu-shirt'));
 assert.ok(!appearanceItemAvailable(initialEquipmentLoadout(),
  initialWardrobe(),'top','field-jacket'));
});
test('chunky silhouette pass expands mass without changing joint anchors or camo bytes',()=>{
 const bdu=BLOUSE_CUT_PROFILE['bdu-shirt'];
 const acu=BLOUSE_CUT_PROFILE['acu-shirt'];
 assert.ok(bdu.rings[1].side>8.5);
 assert.ok(bdu.rings.at(-1).y< -7.2);
 assert.ok(bdu.upperRadius[0]>3.3);
 assert.ok(acu.rings[1].side>7.8);
 assert.ok(acu.upperRadius[0]>3.1);
 assert.ok(bdu.rings[1].side>acu.rings[1].side+.7);
 const rig=createOperatorRig('rook','blue');
 const left=rig.garmentFitAnchors['shoulder-left'].offset.clone();
 const originalHead=rig.visualKit.wardrobeHead;
 const start=initialWardrobe();
 for(const top of ['bdu-shirt','acu-shirt']){
  poseOperator(rig,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
   lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,deterministic:true,
   equipment:initialEquipmentLoadout(),wardrobe:{
    ...start,styles:{top}}
  },0);
  assert.ok(rig.visualKit.fieldBlouses[top].torso.visible);
  assert.ok(!rig.visualKit.jacket.visible);
  assert.ok(!rig.visualKit.lightShirt.visible);
 }
 assert.ok(rig.garmentFitAnchors['shoulder-left'].offset.equals(left));
 assert.strictEqual(rig.visualKit.wardrobeHead,originalHead);
 assert.equal(rig.visualKit.jacket.children.length,0);
 assert.equal(rig.visualKit.lightShirt.children.length,0);
 rig.dispose();
});
