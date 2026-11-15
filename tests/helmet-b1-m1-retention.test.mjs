import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createM1RetentionLayers,updateM1RetentionLayers,
 readM1Chinstrap,m1RetentionAllowed,m1RetentionPath}
 from '../src/operator-m1-retention.ts';
import {achMichRetentionPaths} from '../src/operator-ach-mich-details.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {resolvedM1FieldDress} from '../src/operator-helmet-cover-policy.ts';
test('B1-B both original M1 webbing states are prebuilt and exclusive',()=>{
 const root=new THREE.Group(),layers=createM1RetentionLayers(root);
 assert.equal(root.children.length,2);
 for(const group of root.children){
  assert.equal(group.children.length,1);
  const geo=group.children[0].geometry;
  assert.equal(geo.userData.m1TwoPieceChinstrap,true);
  assert.ok(geo.getAttribute('color'));
 }
 updateM1RetentionLayers(layers,undefined,'face-none');
 assert.equal(layers.fastened.visible,true);
 assert.equal(layers.unfastened.visible,false);
 updateM1RetentionLayers(layers,'unfastened','face-none');
 assert.equal(layers.fastened.visible,false);
 assert.equal(layers.unfastened.visible,true);
 updateM1RetentionLayers(layers,'unfastened','gas-m40');
 assert.equal(layers.unfastened.visible,false);
 assert.equal(m1RetentionAllowed('gas-gp5'),false);
 assert.equal(readM1Chinstrap('old-retired-value'),'fastened');
});
test('B1-B saved M1 wear options survive version-one wardrobe and scrim suppression',()=>{
 const before=initialWardrobe();
 const saved=readWardrobe({...before,m1Chinstrap:'unfastened',
  helmetCover:'none',helmetBand:'none',helmetNet:'none',helmetScrim:'sparse'});
 assert.equal(saved.m1Chinstrap,'unfastened');
 assert.equal(saved.helmetScrim,'sparse');
 assert.equal(resolvedM1FieldDress(saved).helmetScrim,'none');
 assert.equal(resolvedM1FieldDress({...saved,helmetNet:'coarse'}).helmetScrim,'sparse');
 assert.equal(readWardrobe(saved).m1Chinstrap,'unfastened');
});

test('B1 R5: M1 cheek and chin stations reuse approved ACH/MICH safe coordinates',()=>{
 const ach=achMichRetentionPaths('ach');
 for(const sign of [-1,1]){
  const route=m1RetentionPath(sign,'fastened');
  const knownAch=ach[sign<0?2:5];
  assert.deepEqual(route[2],knownAch[1],
   'the first inward turn must stay outside the head until the front face');
  assert.deepEqual(route[3],knownAch[2],
   'lower route must drop under chin with proven ACH/MICH coordinates');
  assert.ok(Math.abs(route[1][0])===4.99&&route[1][1]===3.30&&
   route[1][2]===-1.12,'upper station matches approved PASGT two-point strap');
  assert.ok(Math.abs(route[4][0])<.22&&route[4][1]<-1.1&&route[4][2]<-4.40,
   'webbing now joins UNDER the chin, not against mouth');
  assert.ok(!route.some(p=>Math.abs(p[0])<4&&p[2]>-4.1&&p[1]>-1),
   'no centerline enters head cube');
 }
});
test('B1 R5: both strap states and their QUADS clear the head box',()=>{
 for(const style of ['fastened','unfastened']){
  const root=new THREE.Group();
  const layers=createM1RetentionLayers(root);
  const g=layers[style].children[0].geometry;
  assert.equal(g.userData.m1ProvenHeadClearance,true);
  assert.equal(g.userData.m1ChinstrapRouteRevision,5);
  const pos=g.getAttribute('position');
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   assert.ok(!(Math.abs(x)<4.04&&z>-4.04&&y>-1.02&&y<8.0),
    `webbing vertex ${i} enters head box: ${x},${y},${z}`);
  }
  for(const sign of [-1,1]){
   const route=m1RetentionPath(sign,style);
   for(let j=1;j<route.length;j++)
    for(let n=0;n<=16;n++){
     const t=n/16;
     const p=route[j-1].map((x,k)=>x+(route[j][k]-x)*t);
     assert.ok(!(Math.abs(p[0])<4.06&&p[2]>-4.06&&p[1]>-1.03),
      `strap centerline clips head between stations ${j-1} and ${j}`);
    }
  }
  assert.equal(root.children.length,2);
 }
});
