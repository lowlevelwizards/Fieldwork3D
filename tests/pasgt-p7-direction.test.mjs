import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PASGT_SLIT_ANCHORS} from '../src/operator-pasgt-drape-geometry.ts';
import {createPasgtFieldDress,pasgtDecorationDirection}
 from '../src/operator-pasgt-field-dress.ts';
test('foliage directions extend outward instead of planting vertically',()=>{
 for(const anchor of PASGT_SLIT_ANCHORS){
  const direction=pasgtDecorationDirection(anchor,true);
  const crown=anchor.id.startsWith('crown-');
  // Compare compass bearing rather than the shell's uphill surface
  // normal. A physically draping leaf intentionally rotates down in Y.
  const outward=crown?
   new THREE.Vector3(anchor.position[0],0,anchor.position[2]).normalize():
   new THREE.Vector3(anchor.normal[0],0,anchor.normal[2]).normalize();
  assert.ok(direction.dot(outward)>.68,anchor.id+' outward');
  assert.ok(direction.y<.45,anchor.id+' not vertically planted');
  if(!crown)assert.ok(direction.y<-.35,anchor.id+' down');
 }
});
test('scrim axes hang down and outward from real slits with bounded variation',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 for(const group of [v.foliage,v.scrim]){
  assert.equal(group.children.length,10);
  for(const mount of group.children){
   const anchor=PASGT_SLIT_ANCHORS.find(a=>a.id===mount.userData.pasgtSlitId);
   assert.ok(anchor);
   const aim=new THREE.Vector3(...mount.userData.pasgtPrimaryWorldDirection);
   assert.ok(aim.length()>.99&&aim.length()<1.01);
   if(group===v.scrim){
    assert.ok(aim.y<-.50,anchor.id+' must hang');
    assert.ok(mount.children[0].position.z>.1,'scrim starts outside cover');
   }
  }
 }
});
