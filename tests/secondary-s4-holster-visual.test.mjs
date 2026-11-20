import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialSecondaryEquipment,moveSecondaryHolster}
 from '../src/secondary-equipment.ts';
import {syncHipSecondaryVisual,clearHipSecondaryVisual}
 from '../src/secondary-holster-visual.ts';
import {GLOCK_COYOTE_SLIDE} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {magazineSpace,secondaryCarryClaim,stageMagazines} from '../src/equipment-magazine-placement.ts';

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

test('S4B: one shared carrier budget reserves occupied holster and pistol magazines',()=>{
 const loadout=initialEquipmentLoadout();
 const side=initialSecondaryEquipment('rook','glock-g19-gen3');
 const equipped={...loadout,secondary:side};
 assert.equal(secondaryCarryClaim(equipped).valid,true);
 assert.equal(secondaryCarryClaim(equipped).used.belt,3,
  'holster 1 plus two pistol magazines');
 assert.equal(magazineSpace(equipped).belt,0);
 assert.equal(magazineSpace(loadout).belt,3);
 const primary=stageMagazines([{id:'rook/carbine/extra',weapon:'carbine',rounds:12,
  location:'belt'}],equipped);
 assert.notEqual(primary[0].location,'belt','primary cannot steal pistol-owned belt space');
 const beltless={...equipped,slots:{...equipped.slots,belt:'belt-none'}};
 assert.equal(secondaryCarryClaim(beltless).valid,false);
 assert.ok(secondaryCarryClaim(beltless).overflow.includes('belt'));
});
