import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPoliceVisor,updatePoliceVisor} from '../src/operator-police-visor-visuals.ts';
import {policeVisorFit} from '../src/operator-police-visor-policy.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
test('R5H4: raised and lowered states pivot one real attached shield',()=>{
 const parent=new THREE.Group(),v=createPoliceVisor(parent);
 assert.equal(v.pivot.visible,false);
 const fit=policeVisorFit('police-helmet','face-none','eyes-none','comms-none');
 assert.equal(fit.compatible,true);
 updatePoliceVisor(v,{policeVisorPosition:'lowered'},'police-helmet',fit);
 assert.equal(v.pivot.visible,true);assert.equal(v.pivot.rotation.x,0);
 assert.ok(v.shield.children.length>=5);
 assert.equal(v.lens.depthWrite,false);
 updatePoliceVisor(v,{policeVisorPosition:'raised',policeVisorTint:'smoke',
  policeVisorFrame:'reinforced'},'police-helmet',fit);
 assert.ok(v.pivot.rotation.x>1.70);
 assert.equal(v.lens.opacity,.44);
 assert.equal(v.reinforcement.visible,true);
 updatePoliceVisor(v,{policeVisorPosition:'raised'},'ach',fit);
 assert.equal(v.pivot.visible,false);
});
test('R5H4: mask/goggle/headset fit restrictions are reversible',()=>{
 for(const [face,eyes,headset] of [
  ['gas-m50','eyes-none','comms-none'],
  ['face-none','goggles-field','comms-none'],
  ['face-none','eyes-none','over-ear']
 ])assert.equal(policeVisorFit('police-helmet',face,eyes,headset).compatible,false);
 assert.equal(policeVisorFit('police-helmet','face-none','glasses-standard','comms-none').compatible,true);
});
test('R5H4: cosmetics round-trip without changing helmets or mechanics',()=>{
 const w=initialWardrobe();
 const parsed=readWardrobe({...w,policeVisorPosition:'lowered',
  policeVisorTint:'smoke',policeVisorFrame:'reinforced'});
 assert.equal(parsed.policeVisorPosition,'lowered');
 assert.equal(parsed.policeVisorTint,'smoke');
 assert.equal(parsed.policeVisorFrame,'reinforced');
 assert.equal(readWardrobe({...w,policeVisorPosition:'laser'}).policeVisorPosition,undefined);
});
