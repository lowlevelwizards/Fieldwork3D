import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 shadowRayBox,bakeReceiverShadowAtlas,headwearCastShadowAtlas,
 frontShadowSample,collarCastShadowAtlas,authoredCollarShadowBoxes,
 shadowAtlasCacheSize,BAKED_SHADOW_ATLAS_BYTES
} from '../src/operator-baked-shadow-maps.ts';
import {enableBakedGearAO,bakeGearGeometryAO} from '../src/operator-baked-gear-ao.ts';
import {rememberUnmergedShadowVolumes,bakeCastOnGear,collectCastVolumes}
 from '../src/operator-baked-gear-cast.ts';
import {garmentBoxUV} from '../src/operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from '../src/operator-visual-mesh-merge.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';

test('fixed shadow rays really hit an intervening volume, not nearby side volumes',()=>{
 const o=new THREE.Vector3(0,0,0),dir=new THREE.Vector3(1,1,0).normalize();
 const block={min:new THREE.Vector3(1,1,-.4),max:new THREE.Vector3(2,2,.4)};
 assert.ok(shadowRayBox(o,dir,block)!==null);
 assert.equal(shadowRayBox(o,new THREE.Vector3(0,1,0),block),null);
});
test('optimized cold cast atlas remains pixel-identical to original slab ray bake',()=>{
 // Six independently sampled low-poly faces; test every pixel rather than
 // only checking approximate visual examples. The reference intentionally
 // calls the public legacy Vector3 slab routine for each ray.
 const key='head:test-parity-20261112';
 const center=new THREE.Vector3(0,3,0),size=new THREE.Vector3(8,8,8);
 const boxes=[
  {min:new THREE.Vector3(-3,4,1),max:new THREE.Vector3(4,6,3)},
  {min:new THREE.Vector3(3,4,-3),max:new THREE.Vector3(5,8,1)},
  {min:new THREE.Vector3(-3,4,-4),max:new THREE.Vector3(3,7,-2)}
 ];
 const actual=bakeReceiverShadowAtlas(key,center,size,boxes,.012);
 const rayDirections=[
  new THREE.Vector3(.46,.88,.07).normalize(),
  new THREE.Vector3(.43,.90,.03).normalize(),
  new THREE.Vector3(.47,.88,.04).normalize()
 ];
 const width=256,cell=64,got=actual.image.data;
 const point=new THREE.Vector3(),normal=new THREE.Vector3();
 for(let face=0;face<6;face++){
  const col=face%4,row=Math.floor(face/4);
  for(let v=0;v<cell;v++)for(let u=0;u<cell;u++){
   const su=(u+.5)/cell,sv=(v+.5)/cell;
   point.copy(center);
   if(face===0||face===1){
    point.x+=(face===0?1:-1)*size.x/2;
    point.y+=(sv-.5)*size.y;
    point.z+=(face===0?.5-su:su-.5)*size.z;
    normal.set(face===0?1:-1,0,0);
   }else if(face===2||face===3){
    point.x+=(su-.5)*size.x;
    point.y+=(face===2?1:-1)*size.y/2;
    point.z+=(sv-.5)*size.z;
    normal.set(0,face===2?1:-1,0);
   }else{
    point.x+=(su-.5)*size.x;
    point.y+=(sv-.5)*size.y;
    point.z+=(face===4?1:-1)*size.z/2;
    normal.set(0,0,face===4?1:-1);
   }
   let hits=0;
   const origin=point.clone().addScaledVector(normal,.075);
   for(const dir of rayDirections){
    if(normal.dot(dir)<-.12)continue;
    for(const box of boxes){
     if(shadowRayBox(origin,dir,box,2.55)!==null){hits++;break;}
    }
   }
   const occlusion=hits/rayDirections.length;
   const contact=Math.max(.64,1-.34*occlusion);
   const brow=face!==2&&face!==3?
    THREE.MathUtils.clamp((point.y-2.40)/.42,0,1):1;
   const shade=1-(1-contact)*brow;
   const gradient=1-sv;
   const value=Math.max(.64,shade*(1-.012*gradient)*
    (face===3?.94:1));
   const byte=Math.round(value*255);
   const index=((row*cell+v)*width+col*cell+u)*4;
   assert.equal(got[index],byte,
    'face '+face+' texel '+u+','+v+' shadows changed');
  }
 }
});
test('boonie and helmet brims cast actual shadows ON the front head receiver',()=>{
 const clear=headwearCastShadowAtlas('bare');
 const boonie=headwearCastShadowAtlas('boonie');
 const helmet=headwearCastShadowAtlas('pasgt');
 assert.equal(boonie.image.width,256);
 assert.equal(boonie.image.height,128);
 assert.equal(boonie.image.data.byteLength,BAKED_SHADOW_ATLAS_BYTES);
 assert.equal(boonie.colorSpace,THREE.LinearSRGBColorSpace);
 const clearEye=frontShadowSample(clear,3.4);
 const boonieEye=frontShadowSample(boonie,3.4);
 const helmetEye=frontShadowSample(helmet,3.4);
 assert.ok(clearEye>.95,'bare face should have no brim shadow');
 assert.ok(boonieEye<clearEye-.22,'brim must visibly shade forehead/eyes');
 assert.ok(helmetEye<clearEye-.11,'helmet rim must visibly shade upper face');
 // The lower face is not inside the brim contact zone. Old broad ray
 // visibility produced a muddy half-face gradient; this keeps a clean cheek.
 const lowerFace=frontShadowSample(boonie,1.2);
 const lowerBare=frontShadowSample(clear,1.2);
 assert.ok(lowerFace>=lowerBare-.08,
  'a boonie must not cast a huge shadow down across the cheeks');
 assert.equal(boonie.magFilter,THREE.NearestFilter);
 assert.equal(boonie.minFilter,THREE.NearestMipmapNearestFilter);
 const before=shadowAtlasCacheSize();
 assert.equal(headwearCastShadowAtlas('boonie'),boonie);
 assert.equal(shadowAtlasCacheSize(),before,'a style swaps camo without a rebake');
});
test('actual collar geometry shades neck, not just a darker shirt collar itself',()=>{
 const rig=createOperatorRig('rook','blue',true);
 const bdu=rig.visualKit.fieldBlouses['bdu-shirt'].torso;
 const boxes=authoredCollarShadowBoxes(bdu,rig.chest);
 assert.ok(boxes.length>0,'real BDU collar meshes must be found');
 const skinBare=collarCastShadowAtlas('test-none',[]);
 const neck=collarCastShadowAtlas('test-bdu',boxes);
 const bareShade=frontShadowSample(skinBare,7,0,'neck');
 const underCollar=frontShadowSample(neck,7,0,'neck');
 assert.ok(underCollar<bareShade-.12,
  'collar should project a dark region onto the neck itself');
 rig.dispose();
});
test('baked raycast shadow/gradient preserve material/UVs and one draw call',()=>{
 const receiverGroup=new THREE.Group(),casters=new THREE.Group(),
  chest=new THREE.Group();
 chest.add(receiverGroup,casters);
 const mat=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(mat);
 const base=new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(2,8,9),2,8,9,mat),mat);
 receiverGroup.add(base);
 const a=new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(1,3,3),1,3,3,mat),mat);
 a.position.set(2.0,3,0);
 const b=new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(1,3,3),1,3,3,mat),mat);
 b.position.set(2.0,0,0);
 casters.add(a,b);
 // The genuine separate pouch bounds survive merging, not one giant slab.
 rememberUnmergedShadowVolumes(casters);
 consolidateVisualGroup(casters);
 assert.equal(casters.children.length,1);
 assert.equal(collectCastVolumes(casters,chest).length,2);
 const attr=base.geometry.getAttribute('color');
 const before=Array.from(attr.array),uv=Array.from(base.geometry.getAttribute('uv').array);
 const r=bakeCastOnGear(receiverGroup,[casters],chest,'shirt/vest/rig');
 assert.ok(r.vertices>0);
 assert.ok(r.changed>0,'receiver must actually become darker beneath pouches');
 assert.deepEqual(Array.from(base.geometry.getAttribute('uv').array),uv);
 const once=Array.from(attr.array);
 mat.color.setHex(0x242d2a); // color choice must not change the light.
 const again=bakeCastOnGear(receiverGroup,[casters],chest,'shirt/vest/rig');
 assert.equal(again.changed,0);
 assert.deepEqual(Array.from(attr.array),once,'camo/solid uses SAME light bake');
 bakeCastOnGear(receiverGroup,[],chest,'shirt/none/none');
 assert.ok(attr.array.some((v,i)=>v>once[i]),'old overlapping shadows reset');
 assert.deepEqual(Array.from(base.geometry.getAttribute('uv').array),uv);
});
test('top-to-bottom darkening is independent of color and no new shadow meshes',()=>{
 const mat=new THREE.MeshStandardMaterial();
 enableBakedGearAO(mat);
 const geo=garmentBoxUV(new THREE.BoxGeometry(3,8,4),3,8,4,mat);
 const attr=geo.getAttribute('color'),pos=geo.getAttribute('position'),
  norm=geo.getAttribute('normal');
 const face=(y)=>Array.from({length:pos.count},(_,i)=>i)
  .find(i=>norm.getX(i)>.99&&Math.abs(pos.getY(i)-y)<.001&&
   Math.abs(pos.getZ(i))<.001);
 const top=face(4),bottom=face(-4);
 assert.notEqual(top,undefined);assert.notEqual(bottom,undefined);
 assert.ok(attr.getX(top)>attr.getX(bottom)+.035);
 assert.ok(attr.getX(top)-attr.getX(bottom)<.09,
  'the vertical grade supports the gear; it must not wash out entire panels');
 const orig=Array.from(attr.array);
 mat.color.setHex(0x777768);
 bakeGearGeometryAO(geo,mat);
 assert.deepEqual(Array.from(attr.array),orig);
});
test('appearance swaps actually select shared receiver maps with skin tones intact',()=>{
 const r=createOperatorRig('rook','blue',true);
 const get=(headwear,top,camo)=>({
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastDoorAt:-100,
  lastThrowAt:-100,down:false,surrender:false,aiming:false,firing:false,
  turning:0,unarmedPreview:true,equipment:initialEquipmentLoadout(),
  wardrobe:{...initialWardrobe(),styles:{headwear,top,armorStyle:'armor-bare',
   rigStyle:'field-webbing',packStyle:'field-pack'},
   ...(camo?{headwearCamo:camo}:{})}
 });
 poseOperator(r,get('boonie','bdu-shirt',undefined),0);
 assert.equal(r.faceSkinMaterial.map,headwearCastShadowAtlas('boonie'));
 assert.ok(r.neckSkinMaterial.map?.name.includes('neck:bdu-shirt'));
 const faceMap=r.faceSkinMaterial.map;
 poseOperator(r,get('boonie','bdu-shirt','m81-woodland'),0);
 assert.equal(r.faceSkinMaterial.map,faceMap,'no shadow map per camo');
 poseOperator(r,get('pasgt','acu-shirt',undefined),0);
 assert.equal(r.faceSkinMaterial.map,headwearCastShadowAtlas('pasgt'));
 assert.notEqual(r.faceSkinMaterial.map,faceMap);
 assert.equal(r.faceSkinMaterial.color.getHex(),r.skinMaterial.color.getHex());
 r.dispose();
});
