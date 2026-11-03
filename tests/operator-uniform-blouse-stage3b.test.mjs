import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {BLOUSE_CUT_PROFILE,FIELD_BLOUSE_CUTS,fieldBlouseShellGeometry}
 from '../src/operator-field-blouse-prototypes.ts';
import {UNIFORM_CUT_CAMO,uniformCutCamoChoices,uniformCutCamoCompatible}
 from '../src/operator-uniform-cut-eligibility.ts';
import {UNIFORM_COMPARE_DEFAULT_PRINTS,uniformCompareKit,uniformCompareWardrobe}
 from '../src/operator-uniform-comparison.ts';
import {fabricCamoChoices,fabricCamoCompatible}
 from '../src/operator-fabric-camo-policy.ts';
import {resolvedWardrobe,setWardrobeFabricCamo,initialWardrobe}
 from '../src/operator-wardrobe-data.ts';

const kit=uniformCompareKit();
const pose=(wardrobe)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:kit,wardrobe,unarmedPreview:true
});
const count=(g)=>{let n=0;g.traverse(o=>{if(o instanceof THREE.Mesh)n++});return n};
const ext=(rig,g)=>{
 rig.root.updateMatrixWorld(true);
 return new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
};
test('field blouse categories are genuinely distinct under plain silhouette, not material variations',()=>{
 assert.deepEqual(FIELD_BLOUSE_CUTS,['bdu-shirt','acu-shirt']);
 assert.equal(BLOUSE_CUT_PROFILE['bdu-shirt'].pockets,'four-front');
 assert.equal(BLOUSE_CUT_PROFILE['acu-shirt'].pockets,'slanted-chest-and-upper-arm');
 assert.ok(BLOUSE_CUT_PROFILE['bdu-shirt'].rings.at(-1).y<
  BLOUSE_CUT_PROFILE['acu-shirt'].rings.at(-1).y-.8);
 assert.ok(BLOUSE_CUT_PROFILE['bdu-shirt'].rings[1].side>
  BLOUSE_CUT_PROFILE['acu-shirt'].rings[1].side+.35);
 for(const cut of FIELD_BLOUSE_CUTS){
  const g=fieldBlouseShellGeometry(cut);
  assert.ok(g.index,'shirt loft must be merge-compatible for mobile');
  assert.ok(g.getAttribute('uv'),'authored cloth UVs retained');
  assert.ok(g.getAttribute('position').count>=60);
  g.dispose();
 }
 const r=createOperatorRig('rook','blue');
 const a=r.visualKit.fieldBlouses['bdu-shirt'];
 const b=r.visualKit.fieldBlouses['acu-shirt'];
 const aSize=ext(r,a.torso),bSize=ext(r,b.torso);
 assert.ok(aSize.y>bSize.y+.65,`${aSize.y} vs ${bSize.y}`);
 assert.ok(aSize.z>bSize.z+.55,`${aSize.z} vs ${bSize.z}`);
 assert.ok(a.upper.length===2&&b.upper.length===2);
 assert.ok(a.lower.length===2&&b.lower.length===2);
 assert.ok(count(a.torso)<=4,'merged BDU torso should not emit a draw call per pocket');
 assert.ok(count(b.torso)<=4,'merged ACU torso should not emit a draw call per pocket');
 for(const g of [...a.upper,...a.lower,...b.upper,...b.lower])
  assert.ok(count(g)<=3,'sleeve parts should consolidate by shared materials');
 r.dispose();
});
test('BDU and ACU use authentic independently restricted print lists',()=>{
 for(const id of ['ucp','multicam','scorpion-w2'])
  assert.ok(UNIFORM_CUT_CAMO['acu-shirt'].includes(id));
 assert.ok(UNIFORM_CUT_CAMO['bdu-shirt'].includes('m81-woodland'));
 assert.ok(UNIFORM_CUT_CAMO['bdu-shirt'].includes('three-color-desert'));
 assert.ok(UNIFORM_CUT_CAMO['bdu-shirt'].includes('six-color-desert'));
 assert.ok(UNIFORM_CUT_CAMO['bdu-shirt'].includes('erdl-lowland'));
 assert.equal(uniformCutCamoCompatible('acu-shirt','m81-woodland'),false);
 assert.equal(uniformCutCamoCompatible('bdu-shirt','ucp'),false);
 assert.equal(uniformCutCamoCompatible('acu-shirt','multicam'),true);
 assert.equal(uniformCutCamoCompatible('acu-shirt','mitchell-leaf'),false);
 for(const cut of FIELD_BLOUSE_CUTS){
  const w=uniformCompareWardrobe(cut);
  const outfit=resolvedWardrobe(w,kit);
  const actual=fabricCamoChoices('top',outfit);
  assert.deepEqual([...actual].sort(),[...uniformCutCamoChoices(cut)].sort());
  assert.ok(fabricCamoCompatible(UNIFORM_COMPARE_DEFAULT_PRINTS[cut],
   'top',outfit));
 }
 const shirt=resolvedWardrobe({...initialWardrobe(),
  styles:{top:'bdu-shirt'}},kit);
 assert.equal(fabricCamoCompatible('alpenflage','top',shirt),false,
  'Swiss Alpine coat requires its own silhouette, not generic BDU');

});
test('comparison presets do not mutate player wardrobe or equipment, and invalid print falls back',()=>{
 const base=initialWardrobe(),start=JSON.stringify(base);
 const a=uniformCompareWardrobe('bdu-shirt');
 const b=uniformCompareWardrobe('acu-shirt');
 assert.equal(JSON.stringify(base),start);
 assert.equal(a.styles.top,'bdu-shirt');
 assert.equal(b.styles.top,'acu-shirt');
 assert.equal(a.fabricCamo.top,'m81-woodland');
 assert.equal(b.fabricCamo.top,'scorpion-w2');
 assert.equal(uniformCompareWardrobe('acu-shirt','m81-woodland').fabricCamo.top,'scorpion-w2');
 assert.equal(kit.slots.armor,'armor-none');
 assert.equal(kit.slots.head,'head-none');
 assert.equal(kit.slots.top,'top-uniform');
 assert.equal(kit.slots.rig,'rig-none');
 assert.equal(setWardrobeFabricCamo(a,'top','ucp',resolvedWardrobe(a,kit)),a,
  'saved incompatible cut cannot silently change visual fabric');
 assert.equal(setWardrobeFabricCamo(a,'top','three-color-desert',
  resolvedWardrobe(a,kit)).fabricCamo.top,'three-color-desert');
});
test('rig switches BDU and ACU torso and both articulated sleeves while protecting original animation anchors',()=>{
 const r=createOperatorRig('rook','blue'),v=r.visualKit;
 const original={
  shoulder:r.garmentFitAnchors['shoulder-left'].offset.clone(),
  feet:r.feet.map(f=>f.shoe.geometry),
  headwear:v.wardrobeHead
 };
 let firstPoseRoot=null;
 for(const [cut,other] of [['bdu-shirt','acu-shirt'],['acu-shirt','bdu-shirt']]){
  const w=uniformCompareWardrobe(cut);
  poseOperator(r,pose(w),0);
  assert.equal(v.fieldBlouses[cut].torso.visible,true);
  assert.equal(v.fieldBlouses[other].torso.visible,false);
  assert.ok(v.fieldBlouses[cut].upper.every(g=>g.visible));
  assert.ok(v.fieldBlouses[cut].lower.every(g=>g.visible));
  assert.ok(v.fieldBlouses[other].upper.every(g=>!g.visible));
  assert.ok(v.fieldBlouses[other].lower.every(g=>!g.visible));
  assert.equal(v.jacket.visible,false,'no generic jacket underneath blouse');
  assert.equal(v.lightShirt.visible,false,'no generic shirt collar underneath blouse');
  assert.equal(r.clothMaterial.map?.name.includes('Fieldwork cloth top /'),true);
  assert.equal(r.garmentFitAnchors['shoulder-left'].offset.distanceTo(original.shoulder),0);
  assert.equal(r.visualKit.wardrobeHead,original.headwear);
  assert.deepEqual(r.feet.map(f=>f.shoe.geometry),original.feet);
  if(firstPoseRoot)
   assert.ok(r.root.quaternion.angleTo(firstPoseRoot)<1e-6,
    'clothing cut must not affect the motor heading or fall orientation');
  else firstPoseRoot=r.root.quaternion.clone();
 }
 r.dispose();
});
test('Operator Lab has dedicated paired garment previews with independent prints and clear labels',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const key of ['blouseComparePanel','compareBlouses',
  'bduComparisonPrint','acuComparisonPrint','uniformCutLabels'])
  assert.ok(html.includes('id="'+key+'"'),key);
 assert.match(code,/uniformCompareWardrobe/);
 assert.match(code,/uniformCutCamoChoices/);
 assert.match(code,/uniformPreviewWardrobes\[reference\?'bdu-shirt':'acu-shirt'\]/);
 assert.match(code,/uniformComparing\?\{/);
 assert.match(code,/uniformLabels\.hidden=false/);
});
