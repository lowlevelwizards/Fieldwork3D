import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialSecondaryEquipment,moveSecondaryHolster}
 from '../src/secondary-equipment.ts';
import {syncHipSecondaryVisual,clearHipSecondaryVisual}
 from '../src/secondary-holster-visual.ts';
import {GLOCK_COYOTE_SLIDE} from '../src/weapons/geometry/weapon-visual-palette.ts';

test('S4A: occupied hip holster is one pelvis child with native Glock and two physical spare pouch identities',()=>{
 const hip=new THREE.Group();
 const kit=initialSecondaryEquipment('rook','glock-g19x');
 const root=syncHipSecondaryVisual(hip,kit,true);
 assert.ok(root&&root.parent===hip);
 assert.equal(root.userData.secondaryWeaponId,'glock-g19x');
 assert.equal(root.userData.secondaryHolsterOccupied,true);
 const pouches=[];
 root.traverse(x=>{if(x.userData.secondaryMagazineId)pouches.push(x);});
 assert.equal(pouches.length,2);
 assert.deepEqual(new Set(pouches.map(p=>p.userData.secondaryMagazineId)).size,2);
 assert.equal(syncHipSecondaryVisual(hip,kit,true),root,
  'stable appearance must not allocate every animation frame');
 let found=false;
 root.traverse(x=>{
  if(x instanceof THREE.Mesh&&x.name.includes('slide')){
   found=true;assert.notEqual(x.material,GLOCK_COYOTE_SLIDE,
    'operator dispose must never dispose the pooled Arsenal palette');
  }
 });
 assert.equal(found,true);
 clearHipSecondaryVisual(hip);
 assert.equal(hip.children.length,0);
});

test('S4A: change side removes previous mount; no belt / no sidearm means no invented holster',()=>{
 const hip=new THREE.Group(),kit=initialSecondaryEquipment('rook','glock-g26');
 const right=syncHipSecondaryVisual(hip,kit,true);
 const left=syncHipSecondaryVisual(hip,moveSecondaryHolster(kit,'belt-left'),true);
 assert.notEqual(left,right);
 assert.equal(hip.children.length,1);
 assert.equal(left.userData.secondaryHolsterSide,'belt-left');
 assert.equal(syncHipSecondaryVisual(hip,kit,false),null);
 assert.equal(hip.children.length,0);
 assert.equal(syncHipSecondaryVisual(hip,undefined,true),null);
});
