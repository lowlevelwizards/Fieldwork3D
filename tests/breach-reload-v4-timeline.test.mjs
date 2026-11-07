import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import * as THREE from 'three';
import {choreographV4ReloadHand}
 from '../src/breach-reload-v4-hand.ts';
import {reloadAnimationCue,reloadMechanismFor,
 reloadWeaponPresentationTarget,choreographV4ReloadWeapon}
 from '../src/breach-reload-performance.ts';

test('B24 mechanism belongs to the receiver, not the HK brand name',()=>{
 for(const p of FAMILY_PRESETS){
  const config=selectWeaponFamilyPreset(
    initialWeaponConfiguration(p.weapon),p.id);
  const m=reloadMechanismFor(p.weapon,config);
  assert.equal(m,p.family==='ar'?'ar-bolt-catch':
   p.family==='ak'?'ak-rocking':p.family==='hk'?'hk-roller':'legacy',p.id);
 }
 assert.ok(FAMILY_PRESETS.some(p=>p.id==='hk-mp5a3'));
 assert.ok(FAMILY_PRESETS.some(p=>p.id==='hk-hk53a3'));
 assert.equal(reloadMechanismFor('shotgun'),'shell-tube');
});
test('B24 family signatures fire only for empty magazine actions',()=>{
 for(const [family,expected] of [
  ['ar-bolt-catch','ar-bolt-release'],
  ['ak-rocking','ak-operating-handle'],
  ['hk-roller','hk-slap']
 ]){
  assert.equal(reloadAnimationCue(family,'emergency',.88).gesture,expected);
  assert.equal(reloadAnimationCue(family,'retention',.88).gesture,'none');
 }
 assert.equal(reloadAnimationCue('hk-roller','emergency',.14)
  .gesture,'hk-cock-lock');
 assert.equal(reloadAnimationCue('ar-bolt-catch','emergency',.14)
  .gesture,'none');
 assert.equal(reloadAnimationCue('hk-roller','retention',.14)
  .gesture,'none');
});
test('B24 visual presentation is pure and returns exactly to stock at ends',()=>{
 for(const family of ['ar-bolt-catch','ak-rocking','hk-roller',
  'legacy','shell-tube']){
  for(const mode of ['emergency','retention','shells']){
   for(const time of [0,1]){
    const p=reloadWeaponPresentationTarget(family,mode,time);
    assert.deepEqual(p,{yaw:0,pitch:0,roll:0,
     forward:0,up:0,side:0},family+'/'+time);
   }
   for(const time of [.18,.35,.57,.78,.93]){
    const a=reloadWeaponPresentationTarget(family,mode,time);
    const b=reloadWeaponPresentationTarget(family,mode,time);
    assert.deepEqual(a,b,'replay seeking must be time-pure');
    assert.ok(Object.values(a).every(Number.isFinite));
    assert.ok(Math.abs(a.yaw)<.2&&Math.abs(a.roll)<.3);
    if(mode==='shells')assert.equal(a.forward,0);
   }
  }
 }
});

test('B25 M4 rifle presentation is a single rigid move at every socket',()=>{
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const fit={origin:V(2,-1,3),rotation:new THREE.Euler(.07,.21,-.12),
  stock:V(-9,2,7),primary:V(3,-2,8),support:V(12,-3,-4),
  twoHanded:true,primaryReachable:true,handling:'low',
  contactError:0,stockError:0};
 for(const family of ['ar-bolt-catch','ak-rocking','hk-roller']){
  for(const t of [0,.14,.3,.50,.78,.90,1]){
   const p=choreographV4ReloadWeapon(fit,'emergency',t,family);
   const again=choreographV4ReloadWeapon(fit,'emergency',t,family);
   assert.ok(p.fit.origin.distanceTo(again.fit.origin)<1e-12);
   if(t===0||t===1)assert.equal(p.fit,fit);
   else{
    const qBefore=new THREE.Quaternion().setFromEuler(fit.rotation);
    const qAfter=new THREE.Quaternion().setFromEuler(p.fit.rotation);
    const d=qAfter.clone().multiply(qBefore.clone().invert());
    assert.ok(qAfter.angleTo(qBefore)<.40);
    assert.ok(p.fit.origin.distanceTo(fit.origin)<4.3);
    for(const key of ['origin','primary','support']){
     const expected=fit[key].clone().sub(fit.stock)
      .applyQuaternion(d).add(p.fit.stock);
     assert.ok(expected.distanceTo(p.fit[key])<1e-8,
      family+'/'+key+'/'+t);
    }
   }
  }
 }
});
test('B25 M4 bolt catch hand gesture occurs after insert only on empty reload',()=>{
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const fit={origin:V(2,-1,3),rotation:new THREE.Euler(),
  stock:V(-9,2,7),primary:V(3,-2,8),support:V(12,-3,-4),
  twoHanded:true,primaryReachable:true,handling:'low',
  contactError:0,stockError:0};
 const base={fit,lengthScale:1,progress:.88,mode:'emergency',
  family:'ar',supportX:12,supportY:-3,primaryX:3,
  magazineSocket:{x:1,y:-2.15}};
 const gesture=choreographV4ReloadHand(base,'ar-bolt-catch');
 const noBolt=choreographV4ReloadHand({...base,mode:'retention'},
  'ar-bolt-catch');
 const noBoltLegacy=choreographV4ReloadHand({...base,mode:'retention'},
  'legacy');
 assert.ok(gesture.target.distanceTo(noBolt.target)>.15);
 assert.ok(noBolt.target.distanceTo(noBoltLegacy.target)<1e-12);
 for(const progress of [0,.29,.82,1]){
  const a=choreographV4ReloadHand({...base,progress},'ar-bolt-catch');
  const b=choreographV4ReloadHand({...base,progress},'legacy');
  assert.ok(a.target.distanceTo(b.target)<1e-10,
   'magazine insertion socket stays authored '+progress);
 }
});
