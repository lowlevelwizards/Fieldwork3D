import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {authoredRigStorageCells,authoredRigPouches} from '../src/operator-rig-pouch-layout.ts';
import {createChestRigSilhouettes} from '../src/operator-armor-rig-silhouettes.ts';
import {registeredMagazinePouches} from '../src/operator-magazine-pouch-fit.ts';
test('BT4: headless pouch recipe matches every rendered chest magazine and auxiliary cell',()=>{
 const material=new THREE.MeshStandardMaterial(),parent=new THREE.Group();
 for(const style of ['chest-placard','micro-rig','light-rig','split-front','lbv','full-chest','chicom-rig','bandolier','sadf-webbing','belt-harness']){
  const g=createChestRigSilhouettes(parent,material,material,material,material,material,style)[style];
  const cells=authoredRigStorageCells(style);
  assert.deepEqual(registeredMagazinePouches(g),cells.magazines,style);
  assert.deepEqual(g.userData.auxiliaryPouchCells??[],cells.auxiliary.slice(0,authoredRigPouches(style).filter(s=>!s[6]).length),style);
  g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});g.removeFromParent();
 }
 material.dispose();
});
test('BT4: historical pouches retain the original real lanes',()=>{
 assert.equal(authoredRigStorageCells('field-webbing').magazines.length,6);
 assert.equal(authoredRigStorageCells('alice-lc2').magazines.length,6);
 assert.equal(authoredRigStorageCells('m1956-lce','early').magazines[0].x,1.6);
 assert.equal(authoredRigStorageCells('m1956-lce','late').magazines.length,4);
 assert.equal(authoredRigStorageCells('sadf-webbing').auxiliary.length,4);
});
