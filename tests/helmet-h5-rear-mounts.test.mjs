import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H5.4: rear carrier and battery use centered zone with physical backing',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  for(const name of ['counterweight','battery']){
   const a=kit.modules[name].getObjectByName('helmet-addon-fitted-socket');
   assert.ok(a);
   assert.equal(a.userData.h5RearCenterline,true);
   assert.ok(Math.abs(a.position.x)<.16);
  }
  assert.ok(kit.modules.counterweight.getObjectByName('counterweight-backing-panel'));
  assert.ok(kit.modules.battery.getObjectByName('battery-back-retention-plate'));
  assert.ok(kit.modules.chemlight.getObjectByName('chemlight-elastic-holder-base'));
 }
});
