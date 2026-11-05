import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BAKED_GEAR_AO_MIN,GEAR_CONTACT_AO_FLOOR,
 enableBakedGearAO,bakeGearGeometryAO,bakeGearContactAO,softenHeadwearAO} from '../src/operator-baked-gear-ao.ts';
import {garmentBoxUV} from '../src/operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from '../src/operator-visual-mesh-merge.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {createHeadwearDetailMaterial} from '../src/operator-headwear-materials.ts';
import {createM1HelmetCoverLayers} from '../src/operator-helmet-cover-visuals.ts';

function assertShadedTree(root,label){
 let count=0,shaded=0;
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  const m=o.material;
  if(!(m instanceof THREE.MeshStandardMaterial)||m.userData.fieldworkBakedEquipmentAO!==true)
   return;
  const pos=o.geometry.getAttribute('position');
  if(!pos||!pos.count)return;
  count++;
  const attr=o.geometry.getAttribute('color');
  assert.ok(attr,label+' missing AO on '+o.name);
  assert.equal(attr.count,pos.count,label+' count');
  assert.equal(attr.itemSize,3);
  assert.equal(attr.normalized,true);
  assert.ok(attr.array instanceof Uint8Array,label+' should be 8 bit, not Float32');
  for(let i=0;i<attr.count;i++){
   assert.ok(attr.getX(i)>=GEAR_CONTACT_AO_FLOOR-.004&&attr.getX(i)<=1);
   assert.equal(attr.getX(i),attr.getY(i));
   assert.equal(attr.getX(i),attr.getZ(i));
  }
  shaded++;
 });
 assert.ok(count>0,label+' must contain AO-enabled geometry');
 assert.equal(shaded,count);
}
test('one bounded, 8-bit grayscale geometry attribute works for ANY solid or camo',()=>{
 const mat=new THREE.MeshStandardMaterial({color:0xffffff});
 const tex=new THREE.DataTexture(new Uint8Array([140,92,64,255]),1,1);
 tex.needsUpdate=true;mat.map=tex;
 enableBakedGearAO(mat);
 const geo=garmentBoxUV(new THREE.BoxGeometry(3,5,4),3,5,4,mat);
 const attr=geo.getAttribute('color');
 assert.equal(mat.vertexColors,true);
 assert.ok(attr.count>24,'gear faces have a center vertex for contact shadows');
 assert.equal(attr.array.BYTES_PER_ELEMENT,1);
 const normal=geo.getAttribute('normal');
 const mean=sign=>{
  let total=0,n=0;
  for(let i=0;i<attr.count;i++)if((sign===1&&normal.getY(i)>.9)||
      (sign===-1&&normal.getY(i)<-.9)){
   total+=attr.getX(i);n++;
  }
  return total/n;
 };
 assert.ok(mean(1)>mean(-1)+.1,'top brighter than contact underside');
 const shade=Array.from(attr.array),oldUV=Array.from(geo.getAttribute('uv').array);
 bakeGearGeometryAO(geo,mat);
 assert.equal(geo.getAttribute('color'),attr,'repeat bake is a no-op');
 assert.deepEqual(Array.from(attr.array),shade);
 assert.deepEqual(Array.from(geo.getAttribute('uv').array),oldUV);
 assert.equal(mat.map,tex,'actual camouflage pixels are never rebaked');
 mat.color.setHex(0x24382a);
 assert.deepEqual(Array.from(attr.array),shade,'paint does not influence baked shadow');
 geo.dispose();tex.dispose();mat.dispose();
});
test('batched same-material meshes retain their AO and old draw-call count',()=>{
 const g=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color:0x637056});
 enableBakedGearAO(mat);
 for(let i=0;i<5;i++){
  const geo=garmentBoxUV(new THREE.BoxGeometry(2,3,2),2,3,2,mat);
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(i*3,-i,0);g.add(mesh);
 }
 consolidateVisualGroup(g);
 assert.equal(g.children.length,1,'still one draw call');
 assertShadedTree(g,'batch');
 assert.ok(g.children[0].geometry.getAttribute('color').count>120);
});
test('all armor/rig/pack archetypes bake on construction, including older period gear',()=>{
 const r=createOperatorRig('rook','blue');
 for(const id of ['soft-flak','plate-legacy','plate-standard','plate-heavy'])
  assertShadedTree(r.visualKit.wardrobeGear.armor[id],id);
 for(const id of ['full-chest','split-front','alice-lc2','m1956-lce','sadf-webbing'])
  assertShadedTree(r.visualKit.wardrobeGear.rig[id],id);
 // Default day/field packs use the established single-draw legacy groups.
 // Optional rucksack/assault/admin are constructed in the newer style bank.
 for(const id of ['rucksack','assault-pack','admin-pack'])
  assertShadedTree(r.visualKit.wardrobeGear.pack[id],id);
 assertShadedTree(r.visualKit.fieldPack,'legacy field pack');
 assertShadedTree(r.visualKit.dayPack,'legacy day pack');
 for(const id of ['alice-lc2','m1956-lce'])
  assertShadedTree(r.visualKit.wardrobeGear.waistRig[id],id+' waist');
 r.dispose();
});
test('headwear AO stays present on camo and solid without any program switch',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor','armor-carrier');
 const wardrobe={...initialWardrobe(),styles:{
  headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'full-chest',
  top:'bdu-shirt',trousers:'bdu-trousers',packStyle:'rucksack'
 }};
 const pose=(fabricCamo,headwearCamo)=>({
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastDoorAt:-100,
  lastThrowAt:-100,down:false,surrender:false,aiming:false,firing:false,
  turning:0,deterministic:true,unarmedPreview:true,equipment:kit,
  wardrobe:{...wardrobe,fabricCamo,headwearCamo}
 });
 poseOperator(r,pose({armor:'ucp',gear:'ucp',pack:'ucp'},'m81-woodland'),0);
 const head=r.visualKit.wardrobeHead.headwearMaterials.pasgt;
 const headShape=r.visualKit.wardrobeHead.headwear.pasgt
  .getObjectByName('pasgt-continuous-cuboid-exterior');
 assert.equal(head.vertexColors,true);
 assert.ok(headShape.geometry.getAttribute('color'));
 const preserved=headShape.geometry.getAttribute('color');
 const vest=r.visualKit.wardrobeGear.armor['plate-legacy'];
 assertShadedTree(vest,'printed armor');
 poseOperator(r,pose({armor:'scorpion-w2',gear:'scorpion-w2',pack:'scorpion-w2'},'woodland-dpm'),0);
 assert.equal(head.vertexColors,true);
 assert.equal(headShape.geometry.getAttribute('color'),preserved);
 assertShadedTree(vest,'changed printed armor');
 poseOperator(r,pose({},undefined),0);
 assert.equal(head.vertexColors,true,'solid headwear shares AO shader');
 assert.equal(headShape.geometry.getAttribute('color'),preserved);
 r.dispose();
});
test('M1 cloth and net retain the SAME grayscale AO regardless of cover print',()=>{
 const parent=new THREE.Group(),v=createM1HelmetCoverLayers(parent);
 for(const group of [v.fitted,v.loose,v.clothBand,v.elasticBand,v.net,v.sparseScrim,v.fieldScrim])
  assertShadedTree(group,'M1 cover');
 const attr=v.fitted.children[0].geometry.getAttribute('color');
 assert.ok(attr.count>0);
 assert.equal(v.fabric.vertexColors,true);
});
test('lazy combat gear receives baked AO when first equipped and upon refit',()=>{
 const r=createOperatorRig('rook','blue',true);
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor','armor-carrier');
 kit=setEquipmentChoice(kit,'rig','rig-full');
 const dress=top=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:kit,wardrobe:{...initialWardrobe(),
   styles:{top,trousers:'bdu-trousers',headwear:'pasgt',
    armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'field-pack'}}});
 poseOperator(r,dress('bdu-shirt'),0);
 assertShadedTree(r.visualKit.wardrobeGear.armor['plate-legacy'],'lazy armor');
 assertShadedTree(r.visualKit.wardrobeGear.rig['full-chest'],'lazy rig');
 poseOperator(r,dress('gorka-jacket'),0);
 assertShadedTree(r.visualKit.wardrobeGear.armor['plate-legacy'],'refitted armor');
 assertShadedTree(r.visualKit.wardrobeGear.rig['full-chest'],'refitted rig');
 r.dispose();
});

test('actual neighboring pouch volumes visibly darken contact, not isolated panels',()=>{
 const material=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(material);
 const body=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(2,5,5),2,5,5,material),material);
 const front=body.geometry.getAttribute('position'),
  normals=body.geometry.getAttribute('normal');
 const vertex=Array.from({length:front.count},(_,i)=>i).find(i=>
  normals.getX(i)>.99&&Math.abs(front.getY(i))<.01&&Math.abs(front.getZ(i))<.01);
 assert.notEqual(vertex,undefined,'a center sample exists on the pouch face');
 const start=body.geometry.getAttribute('color').getX(vertex);
 const group=new THREE.Group();group.add(body);
 const pouch=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(1.2,2.5,2.5),
 1.2,2.5,2.5,material),material);
 pouch.position.x=1.85;group.add(pouch);
 const updated=bakeGearContactAO(group);
 assert.ok(updated>=1,'actual nearby gear changes at least one contact shade');
 const contact=body.geometry.getAttribute('color').getX(vertex);
 assert.ok(start-contact>.12,'baked contact is clearly distinct at mobile zoom: '+start+' vs '+contact);
 const preserved=Array.from(body.geometry.getAttribute('color').array);
 material.color.setHex(0x324b37);
 bakeGearContactAO(group);
 assert.deepEqual(Array.from(body.geometry.getAttribute('color').array),preserved,
  'bake is reused on subsequent color or camouflage changes');
 consolidateVisualGroup(group);
 assert.equal(group.children.length,1,'AO does not undo one-draw-call merge');
});
test('isolated equipment does not gain invented neighboring contact shadows',()=>{
 const material=new THREE.MeshStandardMaterial();enableBakedGearAO(material);
 const g=new THREE.Group();
 const a=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(2,3,2),2,3,2,material),material);
 const b=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(2,3,2),2,3,2,material),material);
 b.position.x=15;g.add(a,b);
 const before=Array.from(a.geometry.getAttribute('color').array);
 assert.equal(bakeGearContactAO(g),0);
 assert.deepEqual(Array.from(a.geometry.getAttribute('color').array),before);
});
