import test from 'node:test';import assert from 'node:assert/strict';
import {deriveWeaponRetentionSockets} from '../src/weapons/geometry/weapon-retention-sockets.ts';
const box=(minX,maxX,z=2)=>({min:{x:minX,y:-2,z:-z},max:{x:maxX,y:2,z}});
const receiver=box(-6,4);
test('WR2.0 sockets follow installed art rather than fixed family offsets',()=>{
 const a=deriveWeaponRetentionSockets({receiver,stock:box(-15,-6),handguard:box(4,14)});
 const b=deriveWeaponRetentionSockets({receiver,stock:box(-9,-6),handguard:box(4,8,1.5)});
 assert.ok(a.rear.x<b.rear.x);
 assert.ok(a.front.x>b.front.x);
 assert.equal(b.front.z,1.5);
 assert.deepEqual(a.single,b.single);
});
test('WR2.0 stockless and absent front art are explicit',()=>{
 const a=deriveWeaponRetentionSockets({receiver});
 assert.deepEqual(a.supported,['single']);
 assert.equal(a.front,null);
 assert.ok(a.rear.x>=receiver.min.x);
 assert.equal(deriveWeaponRetentionSockets({receiver:box(4,4)}),null);
});

import * as THREE from 'three';
import {measureWeaponRetentionSockets} from '../src/weapons/geometry/weapon-retention-visual-sockets.ts';
test('WR2.1 nested part transforms are measured in the silhouette root frame',()=>{
 const root=new THREE.Group(),group=new THREE.Group();
 const mat=new THREE.MeshBasicMaterial();
 const mesh=(name,x,width,parent=root)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(width,2,2),mat);
  m.name=name;m.position.x=x;parent.add(m);return m;
 };
 mesh('family-receiver-core',0,8);
 mesh('family-handguard-core',8,8);
 group.position.x=-8;root.add(group);
 mesh('family-stock-core',0,6,group);
 root.position.set(80,40,20);
 const original=measureWeaponRetentionSockets(root);
 group.position.x=-4;
 const folded=measureWeaponRetentionSockets(root);
 assert.ok(original.rear.x<folded.rear.x);
 assert.deepEqual(original.front,folded.front);
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
 mat.dispose();
});

import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,readWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {alternateStockPosition} from '../src/weapon-stock-position.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
test('WR2.2 production catalog supplies finite candidate anchors for installed silhouette art',()=>{
 const material=new THREE.MeshBasicMaterial();
 const failures=[];
 const inspect=(config,id)=>{
  const body=buildWeaponSilhouette(config.weapon,material,material,config);
  try{
   const sockets=body.userData.retentionSockets;
   if(!sockets){failures.push(id+': missing receiver art');return;}
   for(const p of [sockets.rear,sockets.single,...(sockets.front?[sockets.front]:[])])
    if(![p.x,p.y,p.z].every(Number.isFinite))failures.push(id+': nonfinite candidate');
   if(sockets.front&&sockets.front.x<=sockets.rear.x+1)failures.push(id+': inverted support');
  }finally{clearWeaponSilhouette(body);}
 };
 try{
  assert.ok(ARSENAL_REFERENCES.length>0);
  for(const ref of ARSENAL_REFERENCES){
   const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
   inspect(cfg,ref.id);
   const alternate=alternateStockPosition(ref.legacy.parts.stock);
   if(alternate)inspect(readWeaponConfiguration({...cfg,stockPosition:alternate},cfg.weapon),ref.id+'/'+alternate);
  }
 }finally{material.dispose();}
 assert.deepEqual(failures,[]);
});

test('WR2.3 measured seat lands on visible surface rather than an empty envelope corner',()=>{
 const root=new THREE.Group(),material=new THREE.MeshBasicMaterial();
 const add=(name,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(4,2,1),material);
  m.name=name;m.position.set(x,y,z);root.add(m);return m;};
 add('family-receiver-main',0,0,0);add('family-handguard-main',6,0,0);
 add('family-handguard-rail',6,1.6,1);
 const a=measureWeaponRetentionSockets(root);
 assert.ok(a?.front);
 assert.ok(a.front.z===.5||a.front.z===1.5);
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});material.dispose();
});
