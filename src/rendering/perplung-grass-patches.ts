/** A single material/atlas and one instanced draw per patch.
 * Explicit prototype ownership: call dispose when replacing the owner.
 */
import * as THREE from 'three';
import {makeGrassCrossCard,makeGrassTexture} from './perplung-grass-atom.ts';
import type {GrassPatch} from './perplung-grass-placement.ts';
export function buildGrassPatchMeshes(patches:readonly GrassPatch[],texture=makeGrassTexture()){
 const group=new THREE.Group(),clock={value:0};
 const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,
  alphaTest:.48,transparent:false,depthWrite:true,roughness:1,metalness:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.fieldworkGrassTime=clock;
  shader.vertexShader='attribute vec2 grassStyle;\nuniform float fieldworkGrassTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',
   '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x += grassStyle.x * .25;\n#endif');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nfloat grassWave = sin(fieldworkGrassTime*.83+grassStyle.y)*.045 + sin(fieldworkGrassTime*1.13+grassStyle.y*1.7)*.02;\ntransformed.x += position.y*position.y*grassWave;\ntransformed.z += position.y*position.y*grassWave*.6;');
 };
 material.customProgramCacheKey=()=> 'fieldwork-perplung-grass-v2';
 const m=new THREE.Object3D(),color=new THREE.Color(),meshes:THREE.InstancedMesh[]=[];
 for(const patch of patches){
  if(!patch.tufts.length)continue;
  const geom=makeGrassCrossCard(0),styles=new Float32Array(patch.tufts.length*2);
  const mesh=new THREE.InstancedMesh(geom,material,patch.tufts.length);
  for(let i=0;i<patch.tufts.length;i++){
   const t=patch.tufts[i];
   m.position.set(t.x,t.y,t.z);m.rotation.set(0,t.yaw,0);m.scale.set(t.width,t.height,t.width);m.updateMatrix();
   mesh.setMatrixAt(i,m.matrix);
   color.setRGB(t.tint,t.tint,t.tint);mesh.setColorAt(i,color);
   styles[i*2]=t.variant;styles[i*2+1]=t.phase;
  }
  geom.setAttribute('grassStyle',new THREE.InstancedBufferAttribute(styles,2));
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingBox();mesh.boundingBox?.expandByScalar(1);
  mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=1;
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.name='perplung-grass:'+patch.key;group.add(mesh);meshes.push(mesh);
 }
 let disposed=false;
 return {group,clock,material,meshes,dispose(){
  if(disposed)return;disposed=true;
  for(const mesh of meshes){mesh.dispose();mesh.geometry.dispose();}
  material.dispose();texture.dispose();group.removeFromParent();group.clear();
 }};
}
