import test from 'node:test';
import assert from 'node:assert/strict';
import {createPasgtNetGeometry} from '../src/operator-pasgt-field-dress.ts';
test('net uses sparse opposing diagonal diamond strands, not orthogonal roof rails',()=>{
 const g=createPasgtNetGeometry();
 assert.equal(g.userData.pasgtNetPattern,'sparse-diamond');
 assert.equal(g.userData.pasgtNetCordCount,6);
 assert.ok(g.getAttribute('position').count>80);
 assert.ok(g.boundingBox.max.y>8.85);
 assert.ok(g.boundingBox.min.y<5.55);
 assert.ok(g.boundingBox.min.y>5.18);
 assert.ok(g.boundingBox.min.x<-5);
 assert.ok(g.boundingBox.max.x>5);
 assert.ok(g.boundingBox.min.z<-6);
 assert.ok(g.boundingBox.max.z>5.5);
 const positions=g.getAttribute('position');
 for(let i=0;i<positions.count;i++){
  assert.ok(Number.isFinite(positions.getX(i)));
  assert.ok(Number.isFinite(positions.getY(i)));
  assert.ok(Number.isFinite(positions.getZ(i)));
 }
});
