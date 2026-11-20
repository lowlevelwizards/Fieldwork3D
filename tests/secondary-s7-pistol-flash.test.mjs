import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {glockArtSockets} from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {syncHipSecondaryVisual,presentSecondaryDraw,
 presentSecondaryMuzzleFlash,clearHipSecondaryVisual}
 from '../src/secondary-holster-visual.ts';

test('S7.3: one reusable actual muzzle flash switches parents without ghost rifle flashes',()=>{
 const root=new THREE.Group(),hip=new THREE.Group(),chest=new THREE.Group();
 const gun=new THREE.Group(),hand=new THREE.Group();
 const flash=new THREE.Mesh(new THREE.OctahedronGeometry(1),
  new THREE.MeshBasicMaterial());
 root.add(hip,chest);chest.add(gun,hand);
 hand.position.set(12,-2,3);gun.add(flash);
 const kit=initialSecondaryEquipment('rook','glock-g19x');
 try{
  syncHipSecondaryVisual(hip,kit,true,chest);
  presentSecondaryMuzzleFlash(root,gun,flash,hip,kit,0,19.5,2);
  assert.equal(flash.parent,gun);
  assert.equal(flash.position.x,19.5);
  presentSecondaryDraw(hip,hand,kit,1);
  presentSecondaryMuzzleFlash(root,gun,flash,hip,kit,1,19.5,2);
  assert.equal(flash.parent,root);
  const cradle=hip.getObjectByName('secondary-holstered-pistol');
  const sockets=glockArtSockets('glock-g19x');
  const point=new THREE.Vector3(
   sockets.muzzle.x-sockets.holsterPivot.x,
   sockets.muzzle.y-sockets.holsterPivot.y,
   sockets.muzzle.z-sockets.holsterPivot.z);
  const expected=cradle.localToWorld(point);
  assert.ok(flash.getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-4,
   'the actual held model, not the invisible rifle, owns muzzle glow');
  presentSecondaryMuzzleFlash(root,gun,flash,hip,kit,0,19.5,2);
  assert.equal(flash.parent,gun);
  clearHipSecondaryVisual(hip);
  assert.equal(flash.parent,gun,'holster teardown cannot dispose flash');
 }finally{flash.geometry.dispose();flash.material.dispose();}
});
