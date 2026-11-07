import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
import {pasgtCoverVolumes,pasgtHemVolumes,pasgtCoverTexture,createPasgtCoverLayers,
 updatePasgtCoverLayers} from '../src/operator-pasgt-cover-visuals.ts';
import {readPasgtDetails} from '../src/operator-pasgt-cover-policy.ts';
test('PASGT underlying geometry is unchanged; textile stops above source rim',()=>{
 const shell=headwearCuboidVolumes('pasgt');
 const cloth=pasgtCoverVolumes();
 assert.equal(cloth.length,shell.length);
 cloth.forEach((c,i)=>{
  assert.equal(c.name,'pasgt-textile-'+shell[i].name);
  assert.ok(c.y-c.height/2>shell[i].y-shell[i].height/2+.19);
  assert.ok(c.width>shell[i].width);
 });
 assert.equal(pasgtHemVolumes().length,4);
});
test('PASGT texture uses fabric color without shell tint or AO vertex darkening',()=>{
 const root=new THREE.Group(),v=createPasgtCoverLayers(root);
 assert.equal(v.fabric.color.getHex(),0xffffff);
 assert.equal(v.fabric.vertexColors,false);
 const tex=pasgtCoverTexture('m81-woodland','identity-a',0);
 assert.equal(tex.channel,1);
 assert.equal(tex.image.width,128);
 assert.equal(tex.image.height,128);
 const body=v.cover.children.find(x=>x instanceof THREE.Mesh);
 assert.ok(body.geometry.getAttribute('uv1'));
 assert.equal(body.receiveShadow,false);
});
test('PASGT fitted cover and field dress choices are actually mutually exclusive',()=>{
 const root=new THREE.Group(),v=createPasgtCoverLayers(root);
 const defaults=readPasgtDetails({construction:'loops',band:'crossed',
  concealment:'scrim'});
 updatePasgtCoverLayers(v,true,defaults,'m81-woodland','operator-a');
 assert.equal(v.cover.visible,true);
 assert.equal(v.loops.visible,true);
 assert.equal(v.slits.visible,false);
 assert.equal(v.standardBand.visible,false);
 assert.equal(v.crossedBand.visible,true);
 assert.equal(v.scrim.visible,true);
 assert.equal(v.foliage.visible,false);
 assert.equal(v.activePrint,'m81-woodland');
 updatePasgtCoverLayers(v,false,defaults,'m81-woodland','operator-a');
 assert.equal(v.cover.visible,false);
 assert.equal(v.hem.visible,false);
 assert.equal(v.activePrint,'');
 assert.equal(v.crossedBand.visible,true);
});
