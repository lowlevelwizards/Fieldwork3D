import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {enableBakedGearAO} from '../src/operator-baked-gear-ao.ts';
import {garmentBoxUV} from '../src/operator-fabric-camo-materials.ts';
import {refineStaticShadowGeometry,refineStaticReceiver,
 STATIC_RECEIVER_VERTEX_BUDGET,BASE_TORSO_VERTEX_BUDGET}
 from '../src/operator-gear-shadow-receivers.ts';
import {bakeCastOnGear} from '../src/operator-baked-gear-cast.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';

const aMat=()=>{
 const m=new THREE.MeshStandardMaterial({color:0xffffff});
 m.userData.fieldworkFabric=true;enableBakedGearAO(m);
 return m;
};
const build=(w,h,d,mat)=>{
 const g=garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,mat);
 return new THREE.Mesh(g,mat);
};
const bounds=geo=>{
 geo.computeBoundingBox();
 return geo.boundingBox.getSize(new THREE.Vector3());
};
test('only geometry samples change: physical bounds, camouflage UVs and byte AO are preserved',()=>{
 const m=aMat(),original=build(3,13,12,m);
 const old=original.geometry,oldBox=bounds(old);
 const oldUV=old.getAttribute('uv');
 const mapA=new THREE.Vector2(oldUV.getX(0),oldUV.getY(0));
 const result=refineStaticShadowGeometry(old,BASE_TORSO_VERTEX_BUDGET);
 assert.notEqual(result,old);
 assert.ok(result.getAttribute('position').count>old.getAttribute('position').count*4);
 assert.ok(result.getAttribute('position').count<=BASE_TORSO_VERTEX_BUDGET);
 const nowBox=bounds(result);
 assert.ok(nowBox.distanceTo(oldBox)<.00001,'receiver geometry stays physically unchanged');
 const attr=result.getAttribute('color');
 assert.ok(attr.array instanceof Uint8Array && attr.normalized);
 assert.equal(attr.count,result.getAttribute('position').count);
 const uv=result.getAttribute('uv');
 assert.ok(Array.from({length:uv.count},(_,i)=>i).some(i=>
  Math.abs(uv.getX(i)-mapA.x)<.00001&&
  Math.abs(uv.getY(i)-mapA.y)<.00001));
 assert.equal(refineStaticShadowGeometry(result),result,'idempotent');
 m.dispose();old.dispose();result.dispose();
});
test('small strap really projects onto DENSE receiver face; open panel stays bright',()=>{
 const m=aMat(),chest=new THREE.Group(),
 receiver=new THREE.Group(),caster=new THREE.Group();
 const shell=build(2,8,8,m);
 shell.geometry=refineStaticShadowGeometry(shell.geometry,BASE_TORSO_VERTEX_BUDGET,.8);
 receiver.add(shell);chest.add(receiver,caster);
 const strap=build(.95,1.3,2.0,m);
 strap.position.set(1.8,2.0,0);
 caster.add(strap);
 const prior=Array.from(shell.geometry.getAttribute('color').array);
 const change=bakeCastOnGear(receiver,[caster],chest,'strap-contact');
 assert.ok(change.changed>0,'separate strap shades the receiving surface');
 const p=shell.geometry.getAttribute('position'),
  n=shell.geometry.getAttribute('normal'),
  c=shell.geometry.getAttribute('color');
 let near=1,free=0,nearSamples=0,freeSamples=0;
 for(let i=0;i<p.count;i++){
  if(n.getX(i)<.9)continue;
  if(Math.abs(p.getZ(i))<1.2&&p.getY(i)>.6&&p.getY(i)<2.2){
   near=Math.min(near,c.getX(i));nearSamples++;
  }
  if(Math.abs(p.getZ(i))<1.2&&p.getY(i)<-1.8){
   free=Math.max(free,c.getX(i));freeSamples++;
  }
 }
 assert.ok(nearSamples>0&&freeSamples>0,'front receiver samples exist');
 assert.ok(free-near>.13,'narrow real cast at strap landing, not just face darkening');
 assert.ok(free>.78,'unoccluded surface stays bright');
 const first=Array.from(c.array);
 m.color.setHex(0x726f58);
 const repeat=bakeCastOnGear(receiver,[caster],chest,'strap-contact');
 assert.equal(repeat.changed,0);
 assert.deepEqual(Array.from(c.array),first,'color/pattern changes never rebake');
 bakeCastOnGear(receiver,[],chest,'empty');
 assert.ok(Array.from(c.array).some((x,i)=>x>first[i]),
  'empty gear removes old contact shadows rather than accumulating them');
 assert.deepEqual(Array.from(shell.geometry.getAttribute('position').array),
  Array.from(p.array),'positions immutable throughout light bake');
 assert.ok(prior.length===first.length);
});
test('real operator base uniform receives shadow bake and IK limb bounds remain stable',()=>{
 const rig=createOperatorRig('rook','blue',true);
 try{
  const body=rig.visualKit.baseTorso;
  assert.ok(body instanceof THREE.Mesh);
  assert.equal(body.name,'fieldwork-contact-base-torso');
  const initial=bounds(body.geometry);
  const w=initialWardrobe();
  let kit=initialEquipmentLoadout();
  kit=setEquipmentChoice(kit,'armor','armor-carrier');
  kit=setEquipmentChoice(kit,'rig','rig-full');
  poseOperator(rig,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
   lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,deterministic:true,
   unarmedPreview:true,equipment:kit,
   wardrobe:{...w,styles:{...w.styles,top:'bdu-shirt',
    armorStyle:'plate-standard',rigStyle:'full-chest'}}},0);
  const precision=bounds(body.geometry);
  assert.ok(initial.distanceTo(precision)<1e-6,
   'no doubled physical torso/IK lengths');
  assert.ok(body.geometry.getAttribute('position').count>100,
   'real uniform is now a high-precision shadow receiver');
  // Not just connected/segmented: a REAL dressed operator must have
  // measurable occlusion on the torso under an actual equipped carrier.
  const bodyBase=body.geometry.userData.fieldworkCrossLightBase,
   bodyLit=body.geometry.getAttribute('color')?.array;
  assert.ok(bodyBase instanceof Uint8Array&&bodyLit instanceof Uint8Array,
   'uniform must have neutral grayscale shadow data');
  const torsoShaded=bodyBase.filter((v,i)=>i%3===0&&bodyLit[i]<v-7).length;
  assert.ok(torsoShaded>2,'equipped vest must actually cast onto uniform');
  const carrier=rig.visualKit.wardrobeGear.armor['plate-standard'];
  let carrierShaded=0;
  assert.ok(carrier,'equipped plate-standard carrier must exist');
  carrier.traverse(o=>{
   if(!(o instanceof THREE.Mesh))return;
   const b=o.geometry.userData.fieldworkCrossLightBase,
    lit=o.geometry.getAttribute('color')?.array;
   if(b instanceof Uint8Array&&lit instanceof Uint8Array)
    carrierShaded+=b.filter((v,i)=>i%3===0&&lit[i]<v-7).length;
  });
  assert.ok(carrierShaded>2,'equipped rig must actually shade its carrier');
  for(const arm of rig.arms)
   assert.ok(bounds(arm.upper.geometry).y<1.05,
    'one-unit animated limb stays one unit high');
 }finally{rig.dispose();}
});
test('dense receiver uses no extra meshes and capped per-style budget',()=>{
 const m=aMat(),root=new THREE.Group();
 for(let i=0;i<10;i++){
  const x=build(2,6,6,m);
  x.position.x=i*3;root.add(x);
 }
 const count=root.children.length;
 const result=refineStaticReceiver(root,STATIC_RECEIVER_VERTEX_BUDGET);
 assert.equal(root.children.length,count,'not another draw call or overlay');
 assert.ok(result.refined>0);
 assert.ok(result.after<=STATIC_RECEIVER_VERTEX_BUDGET);
 for(const mesh of root.children){
  assert.ok(mesh instanceof THREE.Mesh);
  assert.ok(mesh.geometry.getAttribute('color').array instanceof Uint8Array);
 }
});
