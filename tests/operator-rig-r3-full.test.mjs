import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {RIG_PANEL_INNER_FACES,rigContactFrame}
 from '../src/operator-rig-contact-frame.ts';
import {armorMountedMagazineSocket} from '../src/operator-armor-attachment-frame.ts';
const pose=(r,top,armor,rig)=>{
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',
  armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{armorStyle:armor,
   rigStyle:rig,top,trousers:'bdu-trousers',headwear:'bare',
   beltStyle:'no-belt',packStyle:'no-pack'}}
 },0);
};
test('RIG-C front inside edges touch the selected true underlying armor, not a nominal origin',()=>{
 for(const rig of ['split-front','full-chest','lbv'])
  for(const top of ['combat-shirt','bdu-shirt','gorka-jacket'])
   for(const armor of ['soft-flak','plate-standard','plate-heavy','plate-legacy']){
    const f=rigContactFrame(armor,top,rig);
    assert.ok(Math.abs(f.rigShiftX+RIG_PANEL_INNER_FACES[rig]-
      f.front.x-.14)<.0001,rig+' '+top+' '+armor);
    assert.equal(f.mode,'external-harness');
   }
});
test('RIG-C two tapered LBV halves, front split and full bib are separate recognizable meshes',()=>{
 const r=createOperatorRig('rook','blue');
 const vis=r.visualKit.wardrobeGear.rig;
 const lbv=vis.lbv;
 const halves=lbv.children.filter(c=>c instanceof THREE.Group&&
  c.children.some(n=>n.name==='authored-shaped-plate-bag'));
 assert.equal(halves.length,2,'a real pair of shaped vest halves exists');
 const full=vis['full-chest'];
 assert.ok(full.children.some(c=>c.name==='authored-shaped-plate-bag'),
  'patrol bib has clipped protective-style neckline');
 for(const rig of ['split-front','full-chest','lbv']){
  pose(r,'gorka-jacket','plate-heavy',rig);
  const g=vis[rig],f=rigContactFrame('plate-heavy','gorka-jacket',rig);
  assert.ok(Math.abs(g.position.x-f.rigShiftX)<1e-6);
  const h=g.getObjectByName('uniform-fitted-rig-harness');
  assert.ok(h&&h.children.length);
  const before=h.children.map(x=>x.uuid);
  pose(r,'gorka-jacket','plate-heavy',rig);
  assert.deepEqual(h.children.map(x=>x.uuid),before,'fitted harness memoized');
  const socket=armorMountedMagazineSocket(rig,0,'plate-heavy',1,'gorka-jacket');
  assert.ok(socket.x>f.front.x+.6&&socket.x<f.front.x+2.4);
 }
 const split=vis['split-front'];
 const bounds=new THREE.Box3().setFromObject(split);
 assert.ok(bounds.getSize(new THREE.Vector3()).z>9);
 r.dispose();
});
