import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {studioShadowMode,studioShadowSize,STUDIO_KEY_DIRECTION,
 visibleOperatorBounds,fitStudioKeyShadow} from '../src/operator-studio-lighting.ts';

test('R5 studio shadow modes retain reversible R4 baseline',()=>{
 assert.equal(studioShadowMode(''), 'hybrid');
 assert.equal(studioShadowMode('?operatorLighting=legacy'),'legacy');
 assert.equal(studioShadowMode('?operatorLighting=live'),'hybrid',
  'live-only requires disabling independent bake masks, not implemented');
 assert.equal(studioShadowSize('?operatorShadowSize=512'),512);
 assert.equal(studioShadowSize('?operatorShadowSize=invalid'),1024);
 assert.ok(STUDIO_KEY_DIRECTION.y>.85);
});
test('R5 tight frustum ignores hidden alternate wardrobe pieces',()=>{
 const root=new THREE.Group(),visible=new THREE.Mesh(
  new THREE.BoxGeometry(8,12,7),new THREE.MeshStandardMaterial());
 visible.position.y=20;visible.castShadow=true;visible.receiveShadow=true;
 root.add(visible);
 const hidden=new THREE.Group();
 hidden.visible=false;
 const giant=new THREE.Mesh(new THREE.BoxGeometry(400,400,400),
  new THREE.MeshStandardMaterial());
 giant.castShadow=true;hidden.add(giant);root.add(hidden);
 const bounds=visibleOperatorBounds(root);
 assert.ok(bounds);
 assert.ok(bounds.getSize(new THREE.Vector3()).x<10,
  'hidden options cannot inflate shadow-camera bounds');
 const key=new THREE.DirectionalLight();
 key.castShadow=true;
 assert.equal(fitStudioKeyShadow(key,root),true);
 const cam=key.shadow.camera;
 assert.ok(cam.right-cam.left<40,'operator-only shadow frustum');
 assert.ok(cam.top-cam.bottom<40,'operator-only shadow frustum');
 assert.ok(cam.far>cam.near);
 visible.geometry.dispose();hidden.traverse(o=>{
  if(o instanceof THREE.Mesh)o.geometry.dispose();
 });
});
test('R5 geometry transforms are unchanged by shadow fitting',()=>{
 const group=new THREE.Group();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,5,6),
  new THREE.MeshStandardMaterial());
 mesh.castShadow=true;mesh.position.set(5,21,-3);group.add(mesh);
 const before=mesh.position.clone(),key=new THREE.DirectionalLight();
 fitStudioKeyShadow(key,group);
 assert.ok(mesh.position.distanceTo(before)<1e-9);
});
