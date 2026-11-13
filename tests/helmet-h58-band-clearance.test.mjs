import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAchMichSurfaceBandGeometry} from '../src/operator-helmet-field-fit.ts';
test('H5.8 covered and bare bands have independent clearance-aware edge geometry',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const bare=createAchMichSurfaceBandGeometry(shell,false);
  const covered=createAchMichSurfaceBandGeometry(shell,true);
  assert.notEqual(bare,covered);
  for(const geo of [bare,covered]){
   assert.equal(geo.userData.h58EdgeClearance,.028);
   assert.ok(geo.userData.h58CornerClearance>.06);
   assert.equal(geo.userData.h67CloseFit,true);
   const pos=geo.getAttribute('position');
   for(let i=0;i<pos.count;i++)
    assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));
   const bounds=new THREE.Box3().setFromBufferAttribute(pos);
   assert.ok(bounds.min.x<0&&bounds.max.x>0&&bounds.min.z<0&&bounds.max.z>0);
  }
 }
});
