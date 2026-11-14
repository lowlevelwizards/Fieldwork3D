import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {ACH_MICH_SHELLS,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY,achMichRetentionPaths,
 createAchMichRetentionGeometry,createAchMichBindingGeometry,
 createAchMichDetails,ACH_MICH_BINDING_HEIGHT}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';

test('H5: the fitted cover has one continuous diagonal, no old inward ramp',()=>{
 for(const id of ACH_MICH_SHELLS){
  const drape=createAchMichDrapedGeometry(id);
  assert.equal(drape.userData.achMichDirectFrontRearDiagonal,true);
  const vertices=drape.getAttribute('position');
  assert.ok(vertices.count>25);
  const roof=headwearCuboidVolumes(id)[0];
  assert.ok(drape.boundingBox.max.y>roof.y+roof.height/2);
  // The shoulder is an external continuous vertical face, not a shelf.
  const p=achMichProfile(id);
  const frontExtreme=p.front-.13,rearExtreme=p.rear+.13;
  let front=0,rear=0;
  for(let i=0;i<vertices.count;i++){
   if(Math.abs(vertices.getZ(i)-frontExtreme)<.005)front++;
   if(Math.abs(vertices.getZ(i)-rearExtreme)<.005)rear++;
  }
  assert.ok(front>=12&&rear>=12,id+' fitted front/rear geometry absent');
 }
 const source=readFileSync(new URL('../src/operator-wardrobe-head-visuals.ts',import.meta.url),'utf8');
 // H9 draws only the inward liner beneath fitted cover fabric, never
 // the painted exterior that otherwise bleeds through the cloth.
 assert.match(source,/addInwardBacking\(shell\)/);
 assert.match(source,/child\.userData\.achMichInterior===true/);
 assert.doesNotMatch(source,/hardShell\.visible=true/);
 assert.match(source,/achMichBareShell=true/);
});

test('H5: physical retention starts behind the shell and beneath the lip',()=>{
 assert.ok(ACH_MICH_BINDING_HEIGHT>=.75);
 for(const id of ACH_MICH_SHELLS){
  const profile=achMichProfile(id),paths=achMichRetentionPaths(id);
  assert.equal(paths.length,6);
  for(let side=0;side<2;side++){
   const front=paths[side*3][0],back=paths[side*3+1][0];
   assert.ok(Math.abs(front[0])<profile.side-.35);
   assert.ok(Math.abs(back[0])<profile.side-.35);
   assert.ok(front[1]<achMichHemY(id,front[2])-.1);
   assert.ok(back[1]<achMichHemY(id,back[2])-.1);
   const knot=paths[side*3][1];
   assert.deepEqual(paths[side*3+1].at(-1),knot);
   assert.deepEqual(paths[side*3+2][0],knot);
  }
  const geom=createAchMichRetentionGeometry(id);
  assert.equal(geom.userData.belowShellAnchors,true);
  assert.ok(geom.boundingBox.min.z<-4.5);
  assert.ok(geom.getAttribute('position').count<125);
  const trim=createAchMichBindingGeometry(id);
  assert.ok(trim.getAttribute('position').count>30);
  const layers=createAchMichDetails(new THREE.Group(),id);
  assert.equal(layers.bindingMaterial.vertexColors,false);
  assert.equal(layers.hardware.userData.achMichRetentionScrews,4);
 }
});

test('H5: ACH central ear and deeper nape are substantial, not tiny stepped parts',()=>{
 const v=headwearCuboidVolumes('ach');
 const ear=v.find(x=>x.name==='ach-right-ear-wrap');
 const nape=v.find(x=>x.name==='ach-right-nape-return');
 assert.ok(ear&&nape);
 assert.ok(ear.height>=2.9&&ear.depth>=5.4);
 assert.ok(nape.height>=3.6&&nape.depth>=2.8);
 assert.ok(ear.y-ear.height/2<nape.y-nape.height/2-.15);
 assert.ok(nape.z-nape.depth/2<ear.z+ear.depth/2-.35);
});
