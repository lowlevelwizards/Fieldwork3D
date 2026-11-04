import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARMOR_PROPORTIONS}
 from '../src/operator-armor-proportions.ts';
import {createChestRigSilhouettes,RIG_POCKET_CONSTRUCTION}
 from '../src/operator-armor-rig-silhouettes.ts';
import {WARDROBE_ITEMS} from '../src/operator-wardrobe-data.ts';
test('R10 four plates read from their size/strap/side coverage before texture',()=>{
 const a=ARMOR_PROPORTIONS,s=a['plate-slick'],j=a['plate-jpc'],
  p=a['plate-standard'],h=a['plate-heavy'];
 assert.ok(s.width<j.width&&j.width<p.width&&p.width<h.width);
 assert.ok(p.width-j.width>1.0,'workhorse is visibly wider than skeletal');
 assert.ok(h.width-p.width>1.0,'assault wide envelope, not the standard with pockets');
 assert.ok(h.top>p.top&&h.bottom<p.bottom);
 assert.ok(h.sideHeight>p.sideHeight+1);
 assert.ok(p.sideHeight>s.sideHeight*3);
 assert.ok(h.shoulderWidth>p.shoulderWidth+.60);
 assert.ok(s.shoulderWidth<j.shoulderWidth);
 assert.equal(s.sideStyle,'flat_slab');
 assert.equal(j.sideStyle,'open_two_band');
 assert.equal(h.sideStyle,'side_plate');
 assert.ok(h.sidePlateHeight>5);
});
test('R10 ten rigs use documented independent big-pocket construction types',()=>{
 const names=WARDROBE_ITEMS.filter(x=>x.slot==='rigStyle'&&x.id!=='no-rig')
 .map(x=>x.id);
 for(const id of names)assert.ok(RIG_POCKET_CONSTRUCTION[id],id+' has actual pouch language');
 assert.ok(new Set(names.map(id=>RIG_POCKET_CONSTRUCTION[id])).size>=7);
 assert.notEqual(RIG_POCKET_CONSTRUCTION['micro-rig'],
  RIG_POCKET_CONSTRUCTION['chest-placard']);
 assert.notEqual(RIG_POCKET_CONSTRUCTION['chicom-rig'],
  RIG_POCKET_CONSTRUCTION['split-front']);
 assert.notEqual(RIG_POCKET_CONSTRUCTION['lbv'],
  RIG_POCKET_CONSTRUCTION['sadf-webbing']);
});
test('R10 rendered rigs have authored structural material separation with no NaNs',()=>{
 const chest=new THREE.Group(),body=new THREE.MeshStandardMaterial(),
 pouch=new THREE.MeshStandardMaterial(),hardware=new THREE.MeshStandardMaterial(),
 trim=new THREE.MeshStandardMaterial(),webbing=new THREE.MeshStandardMaterial();
 const rigs=createChestRigSilhouettes(chest,body,pouch,hardware,trim,webbing);
 try{
  for(const id of Object.keys(RIG_POCKET_CONSTRUCTION).filter(x=>x!=='no-rig')){
   const group=rigs[id];assert.ok(group,id+' actual mesh group');
   let visible=0;
   group.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    visible++;
    const p=o.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++)assert.ok(
     Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&
     Number.isFinite(p.getZ(i)),id+' finite voxel geometry');
   });
   assert.ok(visible>=1,id+' retains geometry after batching');
  }
 }finally{
  chest.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
  for(const mat of [body,pouch,hardware,trim,webbing])mat.dispose();
 }
});
