import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARMOR_PROPORTIONS} from '../src/operator-armor-proportions.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {ARMOR_PANEL_DEPTHS,ARMOR_FIT_TOPS,fittedArmorSurfaces}
 from '../src/operator-uniform-fit-envelope.ts';
import {JPC_BRANCH_HALF_SPREAD,JPC_BRANCH_WIDTH,armorStrapLanding,
 plateHalfWidthAt} from '../src/operator-armor-straps.ts';
import {fittedArmoredSidePlate} from '../src/operator-armor-shapes.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

const pose=(r,top,style)=>{
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',
  style==='soft-flak'?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-none');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,
  reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,turning:0,
  deterministic:true,unarmedPreview:true,equipment,
  wardrobe:{...initialWardrobe(),styles:{top,armorStyle:style,
   trousers:'bdu-trousers',rigStyle:'no-rig',beltStyle:'no-belt',
   packStyle:'no-pack',headwear:'bare'}}
 },0);
};
test('polish JPC front shoulder branches expose a real triangular opening without losing their plate landings',()=>{
 assert.ok(2*JPC_BRANCH_HALF_SPREAD-JPC_BRANCH_WIDTH>=.75,
  'triangle is legible at game zoom, not two intersecting narrow ribs');
 const spec=ARMOR_PROPORTIONS['plate-jpc'];
 for(const top of ARMOR_FIT_TOPS){
  const fit=fittedArmorSurfaces('plate-jpc',top,ARMOR_PROFILES['plate-jpc']);
  const landing=armorStrapLanding(fit,spec);
  const outer=landing.frontZ+JPC_BRANCH_HALF_SPREAD+JPC_BRANCH_WIDTH*.5;
  assert.ok(outer<plateHalfWidthAt(spec,landing.frontY)-.17,
   top+' full width of outer limb must land on chamfered plate');
  assert.ok(landing.frontMargin>=.17);
  assert.ok(fit.front-ARMOR_PANEL_DEPTHS['plate-jpc']>0);
 }
});
test('polish heavy side plate is one bold chamfered protective silhouette with one integrated inset',()=>{
 const g=new THREE.Group(),m=new THREE.MeshStandardMaterial();
 const inserts=[
  fittedArmoredSidePlate(g,m,.05,-1.75,7.2,1,4.4,4.28,.72),
  fittedArmoredSidePlate(g,m,.05,-1.75,7.89,1,3.48,3.49,.14),
  fittedArmoredSidePlate(g,m,.05,-1.75,7.2,-1,4.4,4.28,.72)
 ];
 for(const o of inserts){
  assert.equal(o.name,'heavy-protective-side-plate');
  const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());
  assert.ok(size.x>=3.45&&size.y>=3.45);
  assert.ok(size.z>=.13&&size.z<=.73);
 }
 assert.equal(inserts.length,3);
 g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 m.dispose();
});
test('polish legacy collar rises above its yoke without turning into the high PASGT flak collar',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ['combat-shirt','bdu-shirt','gorka-jacket']){
  pose(r,top,'plate-legacy');
  const legacy=r.visualKit.wardrobeGear.armor['plate-legacy'];
  const g=legacy.getObjectByName('uniform-fitted-connectors');
  assert.ok(g);
  const f=fittedArmorSurfaces('plate-legacy',top,ARMOR_PROFILES['plate-legacy']);
  const y=new THREE.Box3().setFromObject(g).max.y;
  assert.ok(y>=f.shoulderY+1.35&&y<=f.shoulderY+1.75,
   top+' legacy raised nape height '+y);
  pose(r,top,'soft-flak');
  const flak=r.visualKit.wardrobeGear.armor['soft-flak'];
  const flakY=new THREE.Box3().setFromObject(
   flak.getObjectByName('uniform-fitted-connectors')).max.y;
  assert.ok(flakY>y+.64,
   top+' historic fragmentation and structured legacy collars distinguishable');
 }
 r.dispose();
});
