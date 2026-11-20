import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialSecondaryEquipment,moveSecondaryHolster}
 from '../src/secondary-equipment.ts';
import {syncHipSecondaryVisual,clearHipSecondaryVisual}
 from '../src/secondary-holster-visual.ts';
import {GLOCK_COYOTE_SLIDE} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {initialEquipmentLoadout,setEquipmentChoice,readEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {magazineSpace,secondaryCarryClaim,stageMagazines,
 quoteSecondaryMagazineLocation} from '../src/equipment-magazine-placement.ts';

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

test('S4.1: each actual spare follows its rig or pack bone; no duplicated hip pouches',()=>{
 const hip=new THREE.Group(),chest=new THREE.Group(),pack=new THREE.Group();
 const state=initialSecondaryEquipment('rook','glock-g19-gen3');
 const placed={...state,spareMagazines:state.spareMagazines.map((m,i)=>({
  ...m,location:i===0?'rig':'backpack'
 }))};
 const root=syncHipSecondaryVisual(hip,placed,true,chest,pack);
 assert.ok(root);
 assert.equal(hip.children.length,1);
 assert.equal(chest.children.length,1);
 assert.equal(pack.children.length,1);
 assert.equal(root.getObjectByName('secondary-magazine-pouch-'+state.spareMagazines[0].id),undefined);
 const chestMag=chest.getObjectByName('secondary-magazine-pouch-'+state.spareMagazines[0].id);
 const packMag=pack.getObjectByName('secondary-magazine-pouch-'+state.spareMagazines[1].id);
 assert.equal(chestMag?.userData.secondaryMagazineLocation,'rig');
 assert.equal(packMag?.userData.secondaryMagazineLocation,'backpack');
 assert.equal(syncHipSecondaryVisual(hip,placed,true,chest,pack),root);
 const sideSwap=syncHipSecondaryVisual(hip,moveSecondaryHolster(placed,'belt-left'),
  true,chest,pack);
 assert.notEqual(root,sideSwap);
 assert.equal(hip.children.length,1,'replaced holster root, not duplicated');
 assert.equal(chest.children.length,1,'old rig pouches disposed');
 assert.equal(pack.children.length,1,'old pack pouches disposed');
 clearHipSecondaryVisual(hip);
 assert.equal(hip.children.length,0);
 assert.equal(chest.children.length,0);
 assert.equal(pack.children.length,0);
});

test('S4.2: belt downgrade preserves Glock and its EXACT ammunition, rehomes pouches',()=>{
 const old={...initialEquipmentLoadout(),
  secondary:initialSecondaryEquipment('rook','glock-g19x')};
 const before=old.secondary.spareMagazines.map(m=>[m.id,m.rounds]);
 const next=setEquipmentChoice(old,'belt','belt-light');
 assert.equal(next.slots.belt,'belt-light');
 assert.equal(next.secondary.loadedRounds,17);
 assert.deepEqual(next.secondary.spareMagazines.map(m=>[m.id,m.rounds]),before);
 assert.ok(next.secondary.spareMagazines.every(m=>m.location!=='belt'),
  'one-cell belt has no free space after one occupied holster');
 assert.equal(secondaryCarryClaim(next).valid,true);
 assert.equal(setEquipmentChoice(next,'belt','belt-none'),next,
  'cannot unequip the actual occupied holster belt');
 const read=readEquipmentLoadout(next,'carbine','rook');
 assert.equal(read.secondary.loadedRounds,17);
 assert.equal(read.secondary.spareMagazines.length,2);
});

test('S4.3: explicit location quote refuses overbooking without changing magazine identities',()=>{
 const base={...initialEquipmentLoadout(),
  secondary:initialSecondaryEquipment('rook','glock-g19-gen3')};
 const first=base.secondary.spareMagazines[0],second=base.secondary.spareMagazines[1];
 const rig=quoteSecondaryMagazineLocation(base,first.id,'rig');
 assert.equal(rig.ok,true);
 assert.equal(rig.kit.secondary.spareMagazines[0].location,'rig');
 assert.equal(rig.kit.secondary.spareMagazines[0].rounds,first.rounds);
 const invalid=quoteSecondaryMagazineLocation(rig.kit,'unknown','backpack');
 assert.equal(invalid.ok,false);assert.equal(invalid.kit,rig.kit);
 const pocket=quoteSecondaryMagazineLocation(rig.kit,second.id,'pocket');
 assert.equal(pocket.ok,true);
 const bothPocket=quoteSecondaryMagazineLocation(pocket.kit,first.id,'pocket');
 assert.equal(bothPocket.ok,false,'a real pocket carries one magazine');
 assert.equal(bothPocket.kit,pocket.kit);
});
