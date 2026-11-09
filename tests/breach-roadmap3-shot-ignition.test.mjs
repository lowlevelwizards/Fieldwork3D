import test from 'node:test';
import assert from 'node:assert/strict';
import {shotDispersionCone} from '../src/breach-shot-ignition.ts';
import {dispersion,handlingInstability,shotYaw} from '../src/breach-ballistics.ts';
import {skillMultiplier} from '../src/breach-skills.ts';
import {sightSpreadScale,weaponHandlingModifiers} from '../src/equipment-weapon-handling.ts';
const weaponIds=['carbine','smg','rifle','shotgun'];
const skills={pointShooting:.5,longRange:.7,precision:.45};
test('shot cone matches prior single-expression ballistics across weapon and range cases',()=>{
 const mods=weaponHandlingModifiers();
 for(const weapon of weaponIds)for(const mode of ['ads','point'])
  for(const range of [30,120,220]){
   const a={weapon,stability:.6,suppression:.22,injuryStage:1,
    recoil:.18,turning:.3,velocity:16,skills};
   const moving=true,optimalRange=100;
   const expected=(dispersion(a.weapon,mode,a.stability,moving,
      a.suppression,a.injuryStage,a.recoil)+
     handlingInstability(a.turning,a.velocity,a.recoil,a.stability))*
     (2-skillMultiplier(mode==='point'?a.skills.pointShooting:
      range>optimalRange?a.skills.longRange:a.skills.precision,.28))*
     sightSpreadScale(mods,mode,range);
   assert.equal(shotDispersionCone(a,mode,range,moving,mods,optimalRange),expected);
   assert.equal(shotYaw(.38,expected,.21,.77),
    shotYaw(.38,shotDispersionCone(a,mode,range,moving,mods,optimalRange),.21,.77));
  }
});
