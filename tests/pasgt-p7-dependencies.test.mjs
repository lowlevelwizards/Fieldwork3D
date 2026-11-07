import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readPasgtDetails,resolvePasgtDetails} from '../src/operator-pasgt-cover-policy.ts';
import {createPasgtFieldDress,updatePasgtFieldDress,createPasgtNetGeometry}
 from '../src/operator-pasgt-field-dress.ts';

test('net forces visible elastic band without mutating saved settings',()=>{
 const raw={slits:false,band:'none',concealment:'net'};
 assert.equal(readPasgtDetails(raw).band,'none');
 assert.equal(resolvePasgtDetails(raw).band,'elastic');
 assert.equal(resolvePasgtDetails(raw,undefined,false).band,'none');
 assert.equal(resolvePasgtDetails({...raw,concealment:'none'}).band,'none');
 assert.deepEqual(raw,{slits:false,band:'none',concealment:'net'});
 const v=createPasgtFieldDress(new THREE.Group());
 updatePasgtFieldDress(v,true,raw,'m81-woodland');
 assert.equal(v.net.visible,true);
 assert.equal(v.band.visible,true);
 updatePasgtFieldDress(v,false,raw,'m81-woodland');
 assert.equal(v.net.visible,false);
 assert.equal(v.band.visible,false);
 updatePasgtFieldDress(v,true,{...raw,concealment:'none'},'m81-woodland');
 assert.equal(v.band.visible,false);
});
test('foliage and scrim require slits but not elastic',()=>{
 for(const concealment of ['foliage','scrim']){
  const d=resolvePasgtDetails({slits:false,band:'none',concealment});
  assert.equal(d.slits,true);assert.equal(d.band,'none');
 }
});
test('net end heights remain within retaining band envelope',()=>{
 const net=createPasgtNetGeometry();
 assert.ok(net.boundingBox.min.y>5.17 && net.boundingBox.min.y<5.91);
 assert.equal(net.userData.pasgtNetTuckedUnderBand,true);
});
