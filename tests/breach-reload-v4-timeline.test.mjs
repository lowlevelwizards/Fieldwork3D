import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {reloadAnimationCue,reloadMechanismFor,
 reloadWeaponPresentationTarget}
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
