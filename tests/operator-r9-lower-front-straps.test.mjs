import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RIG_LOWER_FRONT_ANCHORS,createChestRigSilhouettes,
 updateFittedRigHarness} from '../src/operator-armor-rig-silhouettes.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';

test('R9 both lower front corner straps reach authored panel anchors across armor',()=>{
 const material=new THREE.MeshStandardMaterial(),chest=new THREE.Group();
 const groups=createChestRigSilhouettes(chest,material,material,material,material);
 try{
  for(const [rig,anchor] of Object.entries(RIG_LOWER_FRONT_ANCHORS)){
   for(const top of ARMOR_FIT_TOPS)
    for(const armor of ['armor-bare','soft-vest','soft-flak','plate-standard',
     'plate-heavy','plate-legacy']){
     const frame=rigContactFrame(armor,top,rig);
     updateFittedRigHarness(groups,rig,top,frame);
     const h=groups[rig].getObjectByName('uniform-fitted-rig-harness');
     assert.ok(h instanceof THREE.Group,rig+' actual fitted group');
     const joins=h.children.filter(o=>o.name==='rig-lower-front-return');
     if(frame.mode==='carrier-placard'){
      assert.equal(joins.length,0,rig+'/'+armor+' should be directly clipped');
      continue;
     }
     assert.equal(joins.length,2,rig+'/'+armor+'/'+top+
      ' lower left AND lower right connected');
     for(const [i,o] of joins.entries()){
      const [x,y,z]=o.userData.lowerFrontDestination;
      assert.ok([x,y,z].every(Number.isFinite));
      assert.ok(Math.abs(y-anchor[1])<1e-5,'endpoint on actual vertical panel');
      assert.ok(Math.abs(Math.abs(z)-anchor[2])<1e-5,
       'strap enters authored right/left pane');
      if(rig!=='field-webbing'&&rig!=='belt-harness')
       assert.ok(x>=anchor[0]+.18,'strap penetrates backing to eliminate air gap');
      assert.equal(Math.sign(z),i===0?-1:1,'correct mirrored side');
      const uv=o.geometry.getAttribute('uv');
      const pos=o.geometry.getAttribute('position');
      assert.ok(uv&&pos&&pos.count>=12,'real thick authored strap, not dummy box');
      for(let k=0;k<pos.count;k++)
       assert.ok([pos.getX(k),pos.getY(k),pos.getZ(k)].every(Number.isFinite));
     }
    }
  }
 }finally{
  chest.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
  material.dispose();
 }
});
