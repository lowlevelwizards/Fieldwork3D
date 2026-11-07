import test from 'node:test';
import assert from 'node:assert/strict';
import {createPasgtBandGeometry,PASGT_RING_SAMPLES,pasgtBandSurfacePoint}
 from '../src/operator-pasgt-drape-geometry.ts';
import {createPasgtNetGeometry,PASGT_NET_TIE_Y} from '../src/operator-pasgt-field-dress.ts';
test('net tie points use exactly the same projection as the fitted elastic band',()=>{
 const band=createPasgtBandGeometry(true);
 assert.ok(band.boundingBox.min.y<=5.18);
 for(const s of PASGT_RING_SAMPLES){
  const p=pasgtBandSurfacePoint(s,true,PASGT_NET_TIE_Y);
  assert.equal(p[1],PASGT_NET_TIE_Y);
  assert.ok(p[0]>=band.boundingBox.min.x-.01&&p[0]<=band.boundingBox.max.x+.01);
  assert.ok(p[2]>=band.boundingBox.min.z-.01&&p[2]<=band.boundingBox.max.z+.01);
 }
 const g=createPasgtNetGeometry();
 assert.equal(g.userData.pasgtNetCordCount,6);
 // Ribbon thickness can extend below the geometric center of the tucked tie.
 // Acceptance is exact center placement inside the real band's top/bottom.
 assert.equal(g.userData.pasgtNetTieHeight,PASGT_NET_TIE_Y);
 assert.ok(g.userData.pasgtNetTieHeight<band.boundingBox.max.y);
 assert.ok(g.userData.pasgtNetTieHeight>band.boundingBox.min.y);
 assert.ok(g.boundingBox.min.y>5.18);
});
