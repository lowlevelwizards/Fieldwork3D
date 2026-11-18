/** W1-W5: visual hand-on-fore-end + shoulder-seat parity for real families.
 * No physics exceptions, per-frame geometry scan, hidden arm stretching,
 * ghost gun shift, or authored short-stock regression.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {stockPocket} from '../src/breach-anatomy.ts';
import {riflePoseContacts,UNDERHAND_PALM_DROP,UNDERHAND_PALM_Z,
 supportContactAt} from '../src/breach-weapon-contact-zones.ts';
import {weaponGrips,fitWeaponPose,liveReadyCarryPose,stocklessMP5K}
 from '../src/breach-weapon-pose.ts';
import {lowReadyFamilyFit} from '../src/breach-low-ready-family-fit.ts';

const builds=FAMILY_PRESETS.map(p=>({
 id:p.id,weapon:p.weapon,
 config:selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id)
}));
const family=which=>builds.filter(b=>b.config.build?.family===which);
const v=p=>new THREE.Vector3(...p);
const near=(a,b,eps=.001)=>Math.abs(a-b)<eps;

test('all modeled long-gun families expose real lower, centered palm targets on unmounted furniture',()=>{
 for(const {id,weapon,config} of builds){
  const c=riflePoseContacts(weapon,config);
  assert.ok(c,'missing physical contacts: '+id);
  const grip=weaponGrips(weapon,config,'ready');
  const a=resolveWeaponAssembly(config);
  const hasAccessory=config.slots.foregrip!=='foregrip-none';
  if(hasAccessory)continue; // explicit vertical-grip/handstop owns its socket
  assert.equal(c.support.near.z,UNDERHAND_PALM_Z,id);
  assert.equal(c.support.far.z,UNDERHAND_PALM_Z,id);
  assert.ok(near(c.support.near.y,a.supportY-UNDERHAND_PALM_DROP[c.family]),id);
  assert.ok(near(grip.supportY,c.support.near.y),id+' support is still side-clamped');
  assert.ok(grip.supportX>=c.support.near.x-.01,id);
  assert.ok(c.support.far.x>=c.support.near.x,id);
  const fraction=supportContactAt(c.support,.45);
  assert.ok(fraction.x>=c.support.near.x&&fraction.x<=c.support.far.x,id);
  const fit=fitWeaponPose({weapon,configuration:config,handling:'ready',yaw:0,recoil:0});
  const actual=new THREE.Vector3(grip.supportX*grip.lengthScale,
    grip.supportY,-1.6).applyEuler(fit.rotation).add(fit.origin);
  assert.ok(fit.support.distanceTo(actual)<1e-5,id+' contact separated from rigid gun');
 }
 assert.equal(family('g36').length,4,'all 4 factory G36 configurations sampled');
});

test('every non-M4 long-gun factory low carry seats buttplate beyond front torso',()=>{
 for(const {id,weapon,config} of builds){
  const ready=liveReadyCarryPose('low',weapon,config);
  const fit=fitWeaponPose({weapon,configuration:config,handling:'low',yaw:0,recoil:0});
  assert.ok(near(fit.stock.x,ready.targets.stock[0]),id);
  assert.ok(near(fit.stock.z,ready.targets.stock[2]),id);
  if(id==='ar-m4a1'||stocklessMP5K(config))continue;
  assert.ok(fit.stock.x>=5.49,id+' buttplate hidden in forward torso');
  assert.ok(fit.stock.z>=5.44,id+' buttplate buried inside shoulder');
  assert.ok(fit.stockError<1e-4,id+' physical stock is not on authored seat');
  const grip=weaponGrips(weapon,config,'ready');
  const actual=new THREE.Vector3(grip.stockX*grip.lengthScale,0,0)
   .applyEuler(fit.rotation).add(fit.origin);
  assert.ok(fit.stock.distanceTo(actual)<1e-5,id+' stock moved separately from weapon');
 }
});

test('G36 service, K, C and KA4 share underhand stock and hand contact while retaining unique furniture',()=>{
 for(const {id,weapon,config} of family('g36')){
  const c=riflePoseContacts(weapon,config);
  const raw=resolveWeaponAssembly(config);
  const g=weaponGrips(weapon,config,'ready');
  assert.equal(c.family,'g36');
  assert.ok(near(g.supportY,raw.supportY-.78),id);
  assert.ok(g.supportY<-1.8,'G36 underside hand must sit below polymer floor');
  assert.ok(g.supportX<=c.support.far.x+.01,id);
  const fit=fitWeaponPose({weapon,configuration:config,handling:'low',yaw:0,recoil:0});
  assert.ok(fit.stock.x>=5.49&&fit.stock.z>=5.44,id);
  for(const handling of ['ready','point','ads','high','short']){
   const f=fitWeaponPose({weapon,configuration:config,handling,yaw:0,recoil:0,
    ...(handling==='ads'?{aimBlend:1}:{})});
   assert.ok([f.origin,f.stock,f.primary,f.support].every(p=>
    p.toArray().every(Number.isFinite)),id+' '+handling);
  }
 }
});

test('relative aim stock pocket clears chest without changing armor push or short-stock behavior',()=>{
 assert.ok(stockPocket('ready').x>5.0);
 assert.ok(stockPocket('point').x>=stockPocket('ready').x);
 assert.ok(stockPocket('ads').x>=stockPocket('point').x);
 assert.ok(stockPocket('ads').z>stockPocket('ready').z);
 const g=family('g36')[0],ref={weapon:g.weapon,configuration:g.config,
  handling:'ads',yaw:.12,recoil:0,aimBlend:1};
 const bare=fitWeaponPose(ref),plate=fitWeaponPose({...ref,armorPush:.9});
 assert.ok(plate.stock.x>bare.stock.x+.75,'armor still physically seats stock');
 assert.ok(plate.primary.x>bare.primary.x+.75);
 assert.ok(plate.support.x>bare.support.x+.75);
 const short=fitWeaponPose({...ref,handling:'short',shortCompression:1});
 assert.ok(short.stock.x<bare.stock.x-3);
 assert.ok(short.stock.z>bare.stock.z+1.5);
 const m4=builds.find(x=>x.id==='ar-m4a1');
 assert.ok(m4);
 assert.ok(v(liveReadyCarryPose('low',m4.weapon,m4.config).targets.stock)
  .distanceTo(new THREE.Vector3(3.45,4.45,4.8))<.0001,
  'preserve the explicitly approved M4 low-ready authoring reference');
});

test('stockless and folded weapons do not inherit imaginary buttplate shoulder contact',()=>{
 for(const b of builds.filter(x=>x.config.build?.parts.receiver==='hk-mp5k-stockless')){
  if(!stocklessMP5K(b.config))continue;
  const low=liveReadyCarryPose('low',b.weapon,b.config);
  assert.ok(low.targets.stock[0]<5.5||low.targets.stock[2]<5.45,
   'stockless cap should not be forced onto rifle shoulder');
 }
});
