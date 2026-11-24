import test from 'node:test';
import assert from 'node:assert/strict';
import {BUSH_TIERS,makeBushGeometry,makeBushMaterial} from '../src/rendering/perplung-bush-atom.ts';
import * as THREE from 'three';
test('V3 five drooping shelves retain reference silhouette, tier shading and fixed stems',()=>{
 for(const steps of [2,4]){
  const g=makeBushGeometry(steps),p=g.attributes.position,c=g.attributes.color,w=g.attributes.bushWind;
  const per=(steps+1)**2;
  assert.equal(p.count,5*per+8);assert.equal(g.index.count/3,steps===2?44:164);
  let previous=-Infinity,previousTint=-Infinity;
  for(let j=0;j<5;j++){
   const center=j*per+(per-1)/2,edge=j*per;
   assert.ok(p.getY(center)>p.getY(edge));
   assert.ok(p.getY(center)>previous);previous=p.getY(center);
   assert.ok(c.getX(center)>previousTint);previousTint=c.getX(center);
   assert.equal(w.getY(center),0);assert.equal(w.getY(edge),1);
  }
  for(let i=5*per;i<p.count;i++)assert.equal(w.getY(i),0);
  assert.ok(g.boundingBox.min.x>=-.531&&g.boundingBox.max.x<=.531);
  assert.ok(g.boundingBox.min.z>=-.531&&g.boundingBox.max.z<=.531);
  assert.ok(g.boundingBox.min.y>=-.031&&g.boundingBox.max.y<=1.031);
  g.dispose();
 }
 assert.deepEqual(BUSH_TIERS.map(t=>t.tint),[.82,.92,1.02,1.12,1.22]);
});
test('V3 shared cutout material and clock preserve depth writes and shader cache identity',()=>{
 const t=new THREE.Texture(),{material,clock}=makeBushMaterial(t);
 assert.equal(material.map,t);assert.equal(material.transparent,false);
 assert.equal(material.alphaTest,.48);assert.equal(material.depthWrite,true);
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};
 material.onBeforeCompile(shader,null);
 assert.equal(shader.uniforms.fieldworkBushTime,clock);
 assert.match(shader.vertexShader,/rooted\*wave/);
 clock.value=3;assert.equal(shader.uniforms.fieldworkBushTime.value,3);
 material.dispose();t.dispose();
});
