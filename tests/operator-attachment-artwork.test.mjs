import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ATTACHMENTS,ATTACHMENT_IDS,attachmentFootprint,attachmentMountRequest,attachmentContentSlots} from '../src/operator-attachment-catalog.ts';
import {createAttachmentVisual,setAttachmentSampleCount,placeAttachmentVisual} from '../src/operator-attachment-visuals.ts';
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
  assert.deepEqual(v.root.position.toArray(),[3,2,1]);
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
