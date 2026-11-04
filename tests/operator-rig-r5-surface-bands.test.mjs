import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fittedFlatSurfaceBand} from '../src/operator-armor-shapes.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {rigVisualBudget} from '../src/operator-rig-visual-standards.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

test('R5 flat rear webbing puts its WIDTH along the body instead of standing on edge',()=>{
 const g=new THREE.Group(),m=new THREE.MeshStandardMaterial();
 const band=fittedFlatSurfaceBand(g,m,
  [[-6,3,-3],[-6,-3,-3]],[[-1,0,0],[-1,0,0]],1.68,.62);
 const bounds=new THREE.Box3().setFromObject(band);
 const size=bounds.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-.62)<.015,'normal axis contains thickness only');
 assert.ok(Math.abs(size.z-1.68)<.015,'tangential axis contains full width');
 assert.ok(size.y>5.9,'full back run still connects');
 band.geometry.dispose();m.dispose();
});
test('R5 crossed back straps stay flat and mixed-domain bandolier stays finite',()=>{
 const g=new THREE.Group(),m=new THREE.MeshStandardMaterial();
 const back=fittedFlatSurfaceBand(g,m,
  [[-6,1,3],[-6,-3,-4]],[[-1,0,0],[-1,0,0]],1.52,.62);
 const bb=new THREE.Box3().setFromObject(back);
 assert.ok(bb.getSize(new THREE.Vector3()).x<.65,'rear diagonal never twists edge-on');
 const route=fittedFlatSurfaceBand(g,m,
  [[-6,-3,-4],[-6,2,3],[-1,7,4],[4,7,4],[7,2,3]],
  [[-1,0,0],[-1,0,0],[0,1,0],[0,1,0],[1,0,0]],1.80,.62);
 const positions=route.geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++)
  for(const value of [positions.getX(i),positions.getY(i),positions.getZ(i)])
   assert.ok(Number.isFinite(value),'no degenerate strap corner');
 g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 m.dispose();
});
test('R5 actual fabric and armor contact stays finite throughout rig matrix',()=>{
 const rigs=['micro-rig','light-rig','chicom-rig','bandolier',
  'split-front','full-chest','lbv','field-webbing','sadf-webbing'];
 for(const top of ARMOR_FIT_TOPS)
  for(const armor of ['armor-bare','plate-jpc','plate-heavy'])
   for(const rig of rigs){
    const f=rigContactFrame(armor,top,rig);
    const b=rigVisualBudget(rig);
    assert.ok(f.back.x<0&&f.sideContact>0,rig+' true surfaces');
    assert.ok(f.sideRight.z>=f.sideContact+.49);
    assert.ok(b.web>=1.18&&b.shoulder>=1.60,'chunky minimum');
   }
});
test('R5 fitted harness survives outfit changes without per-frame rebuild',()=>{
 const operator=createOperatorRig('rook','blue');
 try{
  for(const [top,armor,rig] of [
   ['combat-shirt','armor-bare','micro-rig'],
   ['bdu-shirt','armor-bare','light-rig'],
   ['smock-jacket','plate-heavy','split-front'],
   ['gorka-jacket','armor-bare','field-webbing']
  ]){
   let equipment=initialEquipmentLoadout();
   equipment=setEquipmentChoice(equipment,'armor',
    armor==='armor-bare'?'armor-none':'armor-carrier');
   equipment=setEquipmentChoice(equipment,'rig','rig-full');
   const p={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
    lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
    aiming:false,firing:false,turning:0,deterministic:true,
    unarmedPreview:true,equipment,
    wardrobe:{...initialWardrobe(),styles:{
     top,armorStyle:armor,rigStyle:rig,trousers:'bdu-trousers',
     headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
    }}};
   poseOperator(operator,p,0);
   const h=operator.visualKit.wardrobeGear.rig[rig]
    .getObjectByName('uniform-fitted-rig-harness');
   assert.ok(h&&h.children.length,rig+' has a fitted connection');
   const ids=h.children.map(c=>c.uuid);
   poseOperator(operator,p,0);
   assert.deepEqual(h.children.map(c=>c.uuid),ids,'no pose-time rebuild');
  }
 }finally{operator.dispose();}
});
