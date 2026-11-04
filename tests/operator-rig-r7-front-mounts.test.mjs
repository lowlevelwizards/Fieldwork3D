import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createChestRigSilhouettes,updateFittedRigHarness}
 from '../src/operator-armor-rig-silhouettes.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';
const rigs=['micro-rig','chest-placard','light-rig','chicom-rig',
 'split-front','lbv','full-chest','sadf-webbing'];
test('R7 all eight front-bearing rigs land both shoulder ends INSIDE a reinforcement',()=>{
 const chest=new THREE.Group(),fabric=new THREE.MeshStandardMaterial();
 const groups=createChestRigSilhouettes(chest,fabric,fabric,fabric,fabric);
 for(const top of ARMOR_FIT_TOPS)
  for(const armor of ['armor-bare','soft-vest','plate-standard','plate-legacy'])
   for(const rig of rigs){
    const frame=rigContactFrame(armor,top,rig);
    updateFittedRigHarness(groups,rig,top,frame);
    const h=groups[rig].getObjectByName('uniform-fitted-rig-harness');
    assert.ok(h);
    const landings=h.children.filter(o=>o.name==='rig-front-reinforced-landing');
    const clips=h.children.filter(o=>o.name==='carrier-front-direct-clip');
    if(frame.mode==='carrier-placard'){
     assert.equal(landings.length,0,'no standalone harness over modular plate');
     assert.equal(clips.length,2,'two connected front carrier tabs');
    }else{
     assert.equal(landings.length,2,rig+'/'+armor+'/'+top+
      ' both front straps require a reinforcement');
     assert.equal(clips.length,0,'no imaginary placard on traditional rig');
    }
    for(const o of [...landings,...clips]){
     const b=new THREE.Box3().setFromObject(o);
     assert.ok(Number.isFinite(b.min.x)&&b.getSize(new THREE.Vector3()).y>.5);
    }
   }
 chest.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 fabric.dispose();
});
test('R7 only genuinely convertible rigs use plate quick-attach mode',()=>{
 for(const armor of ['plate-jpc','plate-standard','plate-heavy']){
  for(const rig of ['micro-rig','chest-placard'])
   assert.equal(rigContactFrame(armor,'bdu-shirt',rig).mode,'carrier-placard');
  for(const rig of ['chicom-rig','lbv','sadf-webbing','split-front'])
   assert.equal(rigContactFrame(armor,'bdu-shirt',rig).mode,'external-harness');
 }
 for(const armor of ['soft-vest','soft-flak','plate-legacy','plate-slick'])
  for(const rig of ['micro-rig','chest-placard'])
   assert.equal(rigContactFrame(armor,'bdu-shirt',rig).mode,'external-harness');
});
