import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ATTACHMENTS,ATTACHMENT_IDS,attachmentFootprint,attachmentMountRequest,attachmentContentSlots} from '../src/operator-attachment-catalog.ts';
import {createAttachmentVisual,setAttachmentSampleCount,placeAttachmentVisual,sculptGeometry} from '../src/operator-attachment-visuals.ts';
import {resolveBeltMounts} from '../src/operator-belt-mounts.ts';
import {ATTACHMENT_FIXTURES} from '../src/operator-attachment-lab.ts';
test('BT3: all 13 authored families and variants build finite consolidated bounds and separate content slots',()=>{
 const m=new THREE.MeshStandardMaterial(),palette={fabric:m,dark:m,hardware:m,contents:m,accent:m};
 assert.equal(ATTACHMENT_IDS.length,13);
 for(const id of ATTACHMENT_IDS)for(const variant of ATTACHMENTS[id].variants){
  const v=createAttachmentVisual(id,palette,variant,true);
  assert.equal(v.contents.length,attachmentContentSlots(id,variant),id);
  assert.deepEqual(v.footprint,attachmentFootprint(id,variant));
  assert.ok(v.holder.children.length>0,id);
  assert.ok(v.contents.every(c=>!c.visible));
  setAttachmentSampleCount(v,99);
  assert.ok(v.contents.every(c=>c.visible));
  const bounds=new THREE.Box3().setFromObject(v.holder),size=bounds.getSize(new THREE.Vector3());
  assert.ok([size.x,size.y,size.z].every(Number.isFinite),id);
  assert.ok(size.x<=v.footprint.width+.03&&size.y<=v.footprint.height+.03&&size.z<=v.footprint.depth+.03,id+' holder bounds');
  setAttachmentSampleCount(v,0);
  assert.ok(v.contents.every(c=>!c.visible)&&v.holder.visible,id);
  placeAttachmentVisual(v,{x:3,y:2,z:1,yaw:Math.PI/2});
  assert.ok(Math.abs(v.root.position.x-3)<=.23&&v.root.position.y===2&&Math.abs(v.root.position.z-1)<=.23);
  v.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 }
 m.dispose();
});
test('BT3: sample-free live holder exposes sockets but does not create sample meshes',()=>{
 const m=new THREE.MeshStandardMaterial();
 const v=createAttachmentVisual('pistol-mag-pouch',{fabric:m,dark:m,hardware:m,contents:m,accent:m},'double');
 assert.equal(v.contentSockets.length,2);
 assert.ok(v.contents.every(c=>c.children.length===0));
 v.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});m.dispose();
});
test('BT3: all representative fixture requests fit their compatible belts',()=>{
 for(const [name,fixture] of Object.entries(ATTACHMENT_FIXTURES)){
  const req=fixture.items.map((item,i)=>attachmentMountRequest(String(i),item.id,fixture.style,item.variant,item.region));
  assert.ok(req.every(Boolean),name);
  const result=resolveBeltMounts(fixture.style,req);
  assert.equal(result.rejected.length,0,name);assert.equal(result.mounts.length,req.length,name);
 }
 assert.equal(attachmentMountRequest('x','dump-pouch','plain-belt'),null);
 assert.equal(attachmentMountRequest('x','rigid-holster','no-belt'),null);
});

test('BT3R: native rifle-magazine bounding box fits the full-size holder mouth',async()=>{
 const {nativePrimaryMagazineSize}=await import('../src/operator-attachment-reference.ts');
 for(const variant of ['standard','compact','expanded']){
  const size=nativePrimaryMagazineSize(variant==='compact'),p=attachmentFootprint('primary-mag-pouch',variant);
  assert.ok(size.x<=p.width*.99-.88,variant+' width');
  assert.ok(size.z<=p.depth-.88,variant+' depth');
  assert.ok(size.y<=p.height,variant+' height');
 }
 const dump=attachmentFootprint('dump-pouch'),mag=nativePrimaryMagazineSize();
 assert.ok(dump.width>mag.x&&dump.depth>mag.z*2&&dump.height>mag.y);
});
test('BT3R: all authored attachments stay at belt contact without protruding bridges',()=>{
 const m=new THREE.MeshStandardMaterial(),palette={fabric:m,dark:m,hardware:m,contents:m,accent:m};
 for(const id of ATTACHMENT_IDS){
  const v=createAttachmentVisual(id,palette);
  assert.equal(v.root.getObjectByName('mount-bridge'),undefined);
  placeAttachmentVisual(v,{x:4,y:0,z:7,yaw:Math.PI/2,tilt:-.075});
  assert.equal(v.holder.position.z,0);
  assert.equal(v.root.position.z,7);
  v.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 }
 m.dispose();
});

test('BT3R: larger dump bag is reserved at the rear; rolled side fixture remains compatible',()=>{
 const full=attachmentMountRequest('dump','dump-pouch','padded-belt','standard','rear');
 const rolled=attachmentMountRequest('dump','dump-pouch','padded-belt','rolled','right-hip');
 assert.equal(resolveBeltMounts('padded-belt',[full]).mounts[0].region,'rear');
 assert.equal(resolveBeltMounts('padded-belt',[rolled]).mounts[0].region,'right-hip');
});

/** Quantized directed edge incidence checks closed topology independently
 * of face normal attribute generation (the meshes intentionally split verts). */
function assertClosedOriented(geometry,label){
 const p=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e5)).join(',');
 const edges=new Map(),triangles=new Set();
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3();
 let volume=0;
 for(let i=0;i<p.count;i+=3){
  a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
  cross.subVectors(b,a).cross(c.clone().sub(a));
  assert.ok(cross.lengthSq()>1e-10,label+' nondegenerate triangle');
  assert.ok(cross.normalize().dot(new THREE.Vector3().fromBufferAttribute(normal,i))>.999,label+' normal');
  volume+=a.dot(b.clone().cross(c))/6;
  const k=[key(i),key(i+1),key(i+2)],tri=[...k].sort().join('|');
  assert.ok(!triangles.has(tri),label+' duplicate triangle');triangles.add(tri);
  for(let j=0;j<3;j++){
   const from=k[j],to=k[(j+1)%3],e=[from,to].sort().join('|');
   const count=edges.get(e)??[0,0];count[from<to?0:1]++;edges.set(e,count);
  }
 }
 for(const count of edges.values())assert.deepEqual(count,[1,1],label+' manifold edge');
 assert.ok(volume>0,label+' outward winding');
}
test('BT3R final: hollow shells have closed oriented topology and no duplicate faces',()=>{
 const material=new THREE.MeshStandardMaterial(),palette={fabric:material,dark:material,hardware:material,contents:material,accent:material};
 for(const id of ['primary-mag-pouch','pistol-mag-pouch','rigid-holster','radio-holder','flashlight-holder','wedge-holder','grenade-pouch','dump-pouch']){
  for(const variant of ATTACHMENTS[id].variants){
   const v=createAttachmentVisual(id,palette,variant);
   v.holder.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    if(o.geometry.index===null)assertClosedOriented(o.geometry,id+'/'+variant);
    o.geometry.dispose();
   });
  }
 }
 material.dispose();
});
test('BT3R final: flared cavity follows lower taper and has a chunky inset lip',()=>{
 const sections=[{y:0,width:5,back:.7,front:3.7,cut:.6},
  {y:1.4,width:6.4,back:.5,front:4.4,cut:.8},{y:5.5,width:7.5,back:0,front:4.8,cut:.9}];
 const wall=.46,g=sculptGeometry(sections,true,wall);
 assertClosedOriented(g,'flared shell');
 const p=g.getAttribute('position');
 const floor=[],mouth=[];
 for(let i=0;i<p.count;i++){
  if(Math.abs(p.getY(i)-wall)<1e-5)floor.push([p.getX(i),p.getZ(i)]);
  if(Math.abs(p.getY(i)-5.5)<1e-5)mouth.push([p.getX(i),p.getZ(i)]);
 }
 assert.ok(floor.length>0);
 const t=wall/1.4,half=(5+(6.4-5)*t)/2;
 for(const [x,z] of floor){
  assert.ok(Math.abs(x)<=half-wall+1e-5,'floor must be inside the actual lower side wall');
  assert.ok(z>=.7+(.5-.7)*t+wall-1e-5,'floor inside back wall');
  assert.ok(z<=3.7+(4.4-3.7)*t-wall+1e-5,'floor inside front wall');
 }
 assert.ok(mouth.some(([x])=>Math.abs(Math.abs(x)-(7.5/2-wall))<1e-5),'inset mouth thickness');
 assert.ok(mouth.some(([,z])=>Math.abs(z-wall)<1e-5),'back rim thickness');
 assert.ok(mouth.some(([,z])=>Math.abs(z-(4.8-wall))<1e-5),'front rim thickness');
 g.dispose();
});

test('BT3P: native family artwork is not reduced to the legacy carried proxy',async()=>{
 const {nativeEquippedMagazine}=await import('../src/operator-attachment-reference.ts');
 const {carriedMagazineGeometry}=await import('../src/operator-carried-magazines.ts');
 for(const part of ['ar-mag30','ak-mag762-resin','fal-mag20','g36-mag30','hk9-mag30']){
  const g=nativeEquippedMagazine(part),old=carriedMagazineGeometry(part);assert.ok(g&&old,part);old.computeBoundingBox();
  assert.ok(g.boundingBox.getSize(new THREE.Vector3()).y>old.boundingBox.getSize(new THREE.Vector3()).y,part);g.dispose();old.dispose();
 }
});
