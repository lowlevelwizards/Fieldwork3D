import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorPoseCavity} from '../src/operator-pose-cavity-lighting.ts';
import {applyOperatorStudioToon,disposeOperatorStudioToon,
 requestedOperatorRimMode,operatorRimRole} from '../src/operator-studio-toon-lighting.ts';

function textile(){
 const mat=new THREE.MeshStandardMaterial({color:0x86816d,vertexColors:true});
 mat.userData.fieldworkBakedEquipmentAO=true;
 return mat;
}
function rig(){
 const root=new THREE.Group(),cloth=textile(),trousers=textile();
 const torso=new THREE.Mesh(new THREE.BoxGeometry(8,10,12),cloth);
 const legs=[new THREE.Mesh(new THREE.BoxGeometry(3,10,4),trousers),
  new THREE.Mesh(new THREE.BoxGeometry(3,10,4),trousers)];
 root.add(torso,...legs);
 const cavity=createOperatorPoseCavity(torso,legs,cloth,trousers);
 return {root,torso,legs,cavity,cloth,trousers};
}
function shader(){
 return {vertexShader:'#include <begin_vertex>',
  fragmentShader:'#include <color_fragment>\n'+
   'vec3 outgoingLight=vec3(0.5);\n#include <opaque_fragment>',
  uniforms:{}};
}
test('R7.5 composed toon preserves exact per-rig pose cavity uniforms',()=>{
 const r=rig();
 r.cavity.torso.value.set(.41,.72);
 const count=applyOperatorStudioToon(r.root,3);
 assert.equal(count.meshes,3);
 const target=r.torso.material;
 assert.ok(target instanceof THREE.MeshToonMaterial);
 assert.ok(target.customProgramCacheKey().includes('cavity-torso'));
 const compiled=shader();target.onBeforeCompile(compiled,null);
 assert.equal(compiled.uniforms.fieldworkCavity.value,r.cavity.torso.value);
 assert.match(compiled.vertexShader,/vFWCavityLocal=position/);
 assert.match(compiled.fragmentShader,/diffuseColor\.rgb\*=1\.0-clamp\(cavity/);
 r.cavity.torso.value.set(.12,.96);
 assert.equal(compiled.uniforms.fieldworkCavity.value.y,.96,
  'the animated uniform is the original per-rig Vector2, not a copy');
 const thigh=shader();r.legs[0].material.onBeforeCompile(thigh,null);
 assert.equal(thigh.uniforms.fieldworkCavity.value,r.cavity.thighs[0].value);
 assert.notEqual(thigh.uniforms.fieldworkCavity.value,r.cavity.thighs[1].value,
  'left and right limbs must not share pose uniform state');
 disposeOperatorStudioToon(r.root);
 assert.equal(r.torso.material,r.cavity.torso.material);
});
test('R7.5 mode changes restore the original Standard material, not stale toon',()=>{
 const r=rig();
 const source=r.torso.material;
 applyOperatorStudioToon(r.root,2);
 const two=r.torso.material;
 applyOperatorStudioToon(r.root,3);
 const three=r.torso.material;
 assert.notEqual(two,three);
 assert.notEqual(two.customProgramCacheKey(),three.customProgramCacheKey());
 assert.deepEqual(applyOperatorStudioToon(r.root,0),{meshes:0,materials:0});
 assert.equal(r.torso.material,source);
 assert.equal(r.torso.userData.fieldworkStudioToonOriginal,undefined);
 applyOperatorStudioToon(r.root,3);
 assert.equal(r.torso.material,three,'reuse previously compiled source variant');
 disposeOperatorStudioToon(r.root);
 assert.equal(r.root.userData.fieldworkStudioToonCache,undefined);
 assert.equal(r.torso.material,source);
});
test('R7.5 unknown shader hooks and PBR surface maps are not replaced',()=>{
 const root=new THREE.Group();
 const custom=textile();
 custom.onBeforeCompile=s=>{s.fragmentShader+=' // authored effect';};
 const mapped=textile();mapped.normalMap=new THREE.Texture();
 const ordinary=textile();
 const nodes=[custom,mapped,ordinary].map(m=>
  new THREE.Mesh(new THREE.BoxGeometry(2,2,2),m));
 root.add(...nodes);
 const result=applyOperatorStudioToon(root,3);
 assert.equal(result.meshes,1);
 assert.equal(nodes[0].material,custom);
 assert.equal(nodes[1].material,mapped);
 assert.ok(nodes[2].material instanceof THREE.MeshToonMaterial);
 disposeOperatorStudioToon(root);
});
test('R7.6 rim remains opt-in and restricted to semantic hard shells',()=>{
 assert.equal(requestedOperatorRimMode(''),'off');
 assert.equal(requestedOperatorRimMode('?operatorRim=pixel'),'pixel');
 assert.equal(requestedOperatorRimMode('?operatorRim=hard'),'hard');
 assert.equal(requestedOperatorRimMode('?operatorRim=unexpected'),'off');
 const root=new THREE.Group(),m=textile();
 const hard=new THREE.Group();hard.userData.fieldworkRimRegion='hard-shell';
 const soft=new THREE.Group(),hardMesh=new THREE.Mesh(new THREE.BoxGeometry(),m);
 const softMesh=new THREE.Mesh(new THREE.BoxGeometry(),m);
 hard.add(hardMesh);soft.add(softMesh);root.add(hard,soft);
 assert.equal(operatorRimRole(hardMesh),'hard-shell');
 assert.equal(operatorRimRole(softMesh),'none');
 const result=applyOperatorStudioToon(root,3,'pixel');
 assert.equal(result.materials,2,'do not leak rim to shared soft material');
 const hm=hardMesh.material,sm=softMesh.material;
 assert.ok(hm instanceof THREE.MeshToonMaterial);
 assert.ok(sm instanceof THREE.MeshToonMaterial);
 assert.match(hm.customProgramCacheKey(),/rim-pixel/);
 assert.equal(sm.customProgramCacheKey(),THREE.Material.prototype.customProgramCacheKey.call(sm));
 const testShader=shader();hm.onBeforeCompile(testShader,null);
 assert.match(testShader.vertexShader,/vFWRimLocal=position/);
 assert.match(testShader.fragmentShader,/floor\(vFWRimLocal\.y\*\.55\)/);
 assert.match(testShader.fragmentShader,/outgoingLight\*=1\.0\+0\.17\*fwHighlight/);
 const neutral=shader();sm.onBeforeCompile(neutral,null);
 assert.doesNotMatch(neutral.fragmentShader,/fwHighlight/);
 disposeOperatorStudioToon(root);
 assert.equal(hardMesh.material,m);
 assert.equal(softMesh.material,m);
});
