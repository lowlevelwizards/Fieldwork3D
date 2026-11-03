import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {alignSegment} from '../src/breach-ik.ts';
import {outwardLimbPocket,outwardLimbPatch}
 from '../src/operator-garment-mount-frame.ts';
import {UPPER_CUT_PROFILES} from '../src/operator-new-upper-garments.ts';
import {FIELD_TROUSER_PROFILES}
 from '../src/operator-field-trouser-prototypes.ts';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('IK limb local +X is anatomical outward on both left and right',()=>{
 for(const side of [-1,1]){
  const limb=new THREE.Object3D();
  const from=new THREE.Vector3(0,20,side*7),
   to=new THREE.Vector3(3,12,side*8);
  alignSegment(limb,from,to,new THREE.Vector3(0,0,side));
  const outward=new THREE.Vector3(1,0,0).applyQuaternion(limb.quaternion);
  assert.ok(outward.dot(new THREE.Vector3(0,0,side))>.96,
   'local +X must project toward the anatomically outer side');
  const pocket=outwardLimbPocket(3.2,.12,.32,2.5,.40);
  assert.ok(pocket.x>3.2&&pocket.width<.5&&pocket.depth>2);
  assert.equal(pocket.z,0,'pocket should be centered front to back');
 }
 const patch=outwardLimbPatch(2.8,.15,.35,2.4,.15);
 assert.ok(patch.x>2.8&&patch.width<.2);
});
test('new shirt shell fully covers the core torso and includes a standing collar',()=>{
 const p=UPPER_CUT_PROFILES['combat-shirt'].rings;
 for(const ring of p){
  assert.ok(ring.front>5.25&&ring.back< -5.25,
   'front/back fabric must enclose 10-unit base torso');
  assert.ok(ring.side>7.1,'side fabric must enclose 14-unit base torso');
 }
 const code=src('../src/operator-new-upper-garments.ts');
 assert.ok(code.includes('The standing 1/4-zip collar'));
 assert.ok(code.includes('box(torso,body,-4.18,7.08,0'));
 assert.doesNotMatch(code,/box\(torso,body,5\.19,-\.05,0,\.24,11\.68,10\.88\)/,
  'old floating front slab must not return');
});
test('all sewn limb pouches use outward frame rather than side-signed Z',()=>{
 const trousers=src('../src/operator-field-trouser-prototypes.ts');
 const blouse=src('../src/operator-field-blouse-prototypes.ts');
 assert.ok(trousers.includes('outwardLimbPocket(p.thigh[2][1]'));
 assert.ok(trousers.includes('outwardLimbPocket(p[hem][1][1]'));
 assert.ok(blouse.includes('outwardLimbPocket(profile.upperRadius[0]'));
 assert.ok(!trousers.includes('const lateral=side*'));
 const ac=FIELD_TROUSER_PROFILES['acu-trousers'];
 assert.ok(ac.cargo[0]<.6&&ac.cargo[2]>2.5);
});
