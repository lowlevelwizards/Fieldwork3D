import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createModernHelmetCoverLayers,updateModernHelmetCoverLayers}
 from '../src/operator-helmet-cover-geometry.ts';
import {createHelmetHardware,updateHelmetHardware}
 from '../src/operator-helmet-module-visuals.ts';
import {readHelmetSetup} from '../src/operator-helmet-setup-policy.ts';
test('H1 one-time FAST hardware and fitted textile actually construct and toggle',()=>{
 const root=new THREE.Group();
 const cover=createModernHelmetCoverLayers(root,'fast-sf');
 const modules=createHelmetHardware(root,'fast-sf');
 const settings=readHelmetSetup({
  cover:'fitted',rails:'arc',shroud:'integrated',nvg:'dual-stowed',
  headsetMount:'rail',retention:'dial',rearModule:'battery',rearStrobe:true
 });
 updateModernHelmetCoverLayers(cover,'fast-sf',settings,undefined,'probe');
 updateHelmetHardware(modules,settings,'boom-headset');
 assert.equal(cover.fitted.visible,true);
 assert.equal(cover.loose.visible,false);
 assert.equal(modules.rails.arc.visible,true);
 assert.equal(modules.shrouds.integrated.visible,true);
 assert.equal(modules.nvg['dual-stowed'].visible,true);
 assert.equal(modules.railEars.visible,true);
 assert.equal(modules.strobe.visible,true);
 assert.ok(root.children.length>0);
});
