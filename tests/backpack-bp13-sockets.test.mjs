import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildAuthoredPack,AUTHORED_PACK_STYLES,packSocketsForStyle} from '../src/operator-backpack-art.ts';
import {authoredCargoSocket,authoredCargoSocketForStyle} from '../src/operator-backpack-sockets.ts';
const material=()=>({fabric:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial()});
test('BP13 external mounts require an actual compatible socket on requested side',()=>{
 const day=buildAuthoredPack('day-pack',material());
 assert.equal(authoredCargoSocket(day,'medical',undefined,'medical-basic'),undefined);
 assert.equal(authoredCargoSocket(day,'medical','medical-pack-right','medical-basic'),undefined);
 assert.equal(authoredCargoSocket(day,'medical','medical-pack-left','medical-basic').id,'left-medical');
 assert.equal(authoredCargoSocket(day,'utility','utility-pack-right','utility-light').id,'right-utility');
 const civilian=buildAuthoredPack('civilian-pack',material());
 assert.equal(authoredCargoSocket(civilian,'utility','utility-pack-right','utility-radio'),undefined);
 const comms=buildAuthoredPack('comms-pack',material());
 assert.equal(authoredCargoSocket(comms,'utility','utility-pack-left','utility-radio').kind,'radio');
});

test('BP13 picker eligibility and actual mesh mounts agree for every style and side',()=>{
 for(const style of AUTHORED_PACK_STYLES){
  const art=buildAuthoredPack(style,material());
  assert.deepEqual(art.sockets,packSocketsForStyle(style));
  assert.equal(new Set(art.sockets.map(s=>s.id)).size,art.sockets.length);
  for(const kind of ['medical','utility'])for(const side of ['left','right']){
   const request=kind+'-pack-'+side;
   for(const item of ['medical-basic','utility-light','utility-radio']){
    assert.deepEqual(authoredCargoSocketForStyle(style,kind,request,item),authoredCargoSocket(art,kind,request,item));
   }
  }
 }
 assert.equal(authoredCargoSocketForStyle('no-pack','medical','medical-pack-left','medical-basic'),undefined);
 assert.equal(authoredCargoSocketForStyle('civilian-pack','utility','utility-pack-right','utility-light'),undefined);
 assert.equal(authoredCargoSocketForStyle('comms-pack','utility','utility-pack-left','utility-light'),undefined);
 assert.equal(authoredCargoSocketForStyle('comms-pack','utility','utility-pack-right','utility-radio')?.kind,'radio');
});
