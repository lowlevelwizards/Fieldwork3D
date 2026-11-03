import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {TILE_WORLD_SIZE} from '../src/rendering/pixel-materials.ts';
import {createOperatorRig} from '../src/breach-operator-rig.ts';
import {UPPER_CUT_PROFILES} from '../src/operator-new-upper-garments.ts';
import {BLOUSE_CUT_PROFILE} from '../src/operator-field-blouse-prototypes.ts';
import {FIELD_TROUSER_PROFILES,garmentLegLoft}
 from '../src/operator-field-trouser-prototypes.ts';
import {gorkaSpecialtyTexture,garmentColorValues,topColorwayChoices}
 from '../src/operator-upper-colorways.ts';

const source=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
test('smock and Gorka silhouettes have distinct but restrained volumes',()=>{
 const shirt=UPPER_CUT_PROFILES['combat-shirt'].rings;
 for(const name of ['smock-jacket','gorka-jacket']){
  const rings=UPPER_CUT_PROFILES[name].rings;
  assert.ok(rings[1].side>shirt[1].side+.4);
  assert.ok(rings[1].side<8.3,'outerwear is not plate-armored shoulders');
  assert.ok(rings.at(-1).y<shirt.at(-1).y-1.5);
 }
 const src=source('../src/operator-new-upper-garments.ts');
 assert.ok(src.includes('shell(torso,body,UPPER_CUT_PROFILES[cut].rings)'),
  'single knit shell must wrap front AND back');
 assert.ok(src.includes('box(torso,trim,3.02,7.20,0'),
  'combat shirt must include the central collar zipper');
 assert.ok(!src.includes('9.2,1.20,3.40'),
  'remove oversized high-shoulder slabs');
});
test('solids for folded cuffs remain separate from camo and specialty pixels keep metric repeat',()=>{
 const r=createOperatorRig('rook','blue');
 const v=r.visualKit.newUpper;
 assert.notStrictEqual(v.combatKnit,r.clothMaterial);
 assert.notStrictEqual(v.smockCuff,r.clothMaterial);
 assert.notStrictEqual(v.gorkaCuff,v.mountainPanel);
 assert.notStrictEqual(v.gorkaCuff,v.mountainCanvas);
 assert.equal(gorkaSpecialtyTexture('ss-leto').repeat.x,TILE_WORLD_SIZE/64);
 assert.equal(gorkaSpecialtyTexture('ss-autumn').repeat.y,TILE_WORLD_SIZE/64);
 for(const id of ['khaki-olive','gray-black','desert-brown']){
  assert.ok(topColorwayChoices('gorka-jacket').some(([key])=>key===id),id);
  const v=garmentColorValues('gorka-jacket',id);
  assert.notEqual(v.gorkaBase,v.gorkaPanel,'panels should read as contrast');
 }
 const knit=v.cuts['combat-shirt'].torso.children
  .filter(x=>x instanceof THREE.Mesh&&x.material===v.combatKnit);
 assert.ok(knit.length>0,'solid knit front must be an actual mesh');
 const bounds=new THREE.Box3().setFromObject(v.cuts['combat-shirt'].torso);
 assert.ok(bounds.max.x>5.20,'front knit remains forward of shell');
 r.dispose();
});
test('outer pocket geometry is upright and knee cloth overlaps articulated seams',()=>{
 for(const [cut,p] of Object.entries(FIELD_TROUSER_PROFILES)){
  assert.ok(p.cargo[0]<p.cargo[2]*.25,cut+' pocket has narrow outward depth');
  assert.ok(p.cargo[1]*11.25>p.cargo[0]*5,
   cut+' pocket is taller than its thickness after bone scaling');
  assert.ok(p.thigh.at(-1)[0]>.56,cut+' thigh goes past knee');
  for(const hem of ['unbloused','bloused','cuffed']){
   assert.ok(p[hem][0][0]<-.58,cut+' shin wraps behind knee');
   assert.ok(p[hem].at(-1)[0]<=.48,cut+' fabric ends before ankle');
   const geo=garmentLegLoft(p[hem],11.25);
   const uv=geo.getAttribute('uv'),points=geo.getAttribute('position');
   for(let i=0;i<uv.count;i++){
    assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
    assert.ok(Number.isFinite(points.getX(i))&&Number.isFinite(points.getZ(i)));
   }
   geo.dispose();
  }
 }
 assert.ok(BLOUSE_CUT_PROFILE['acu-shirt'].rings[1].side<
  BLOUSE_CUT_PROFILE['bdu-shirt'].rings[1].side);
 const blouse=source('../src/operator-field-blouse-prototypes.ts');
 assert.ok(blouse.includes('outwardLimbPocket(profile.upperRadius[0]'),
  'ACU bicep pockets use actual local limb +X outside');
});
