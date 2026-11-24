/** V4 preview only: one mixed ground-mark draw and one bounded droplet draw.
 * Existing visibility owner decides which marks/particles are submitted.
 * Resources live with the existing persistent tactical effect root.
 */
import * as THREE from 'three';
import {STAIN_CELL,STAIN_VARIANTS,stainAlphaPixels,stainVariant} from './breach-stain-atlas.ts';

export function makeStainMarkBatch(capacity:number){
 const texture=new THREE.DataTexture(stainAlphaPixels(),STAIN_CELL*STAIN_VARIANTS,STAIN_CELL,THREE.RGBAFormat);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;
 texture.generateMipmaps=false;texture.needsUpdate=true;
 const geometry=new THREE.CircleGeometry(1,9);
 const style=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
 style.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('stainStyle',style);
 const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,
  opacity:.82,depthTest:true,depthWrite:false,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.fieldworkStainAtlas={value:texture};
  shader.vertexShader='attribute float stainStyle;\nvarying float vStainStyle;\nvarying vec2 vStainUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvStainStyle=stainStyle;vStainUV=uv;');
  shader.fragmentShader='uniform sampler2D fieldworkStainAtlas;\nvarying float vStainStyle;\nvarying vec2 vStainUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\nif(vStainStyle>=0.0){vec2 at=vec2((vStainStyle+vStainUV.x)*.25,vStainUV.y);diffuseColor.a*=texture2D(fieldworkStainAtlas,at).a;}');
 };
 material.customProgramCacheKey=()=> 'fieldwork-v4-stain-atlas';
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);
 mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
 mesh.userData.fieldworkDrawFamily='mixed-impact-stain';
 return {mesh,texture,style,
  setStyle(index:number,surface:string|undefined,x:number,y:number){
   style.setX(index,surface==='blood'?stainVariant(x,y):-1);
  },
  finish(){style.needsUpdate=true;},
  dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();texture.dispose();}
 };
}

export const BLOOD_DROPLET_CAPACITY=80;
export function makeBloodDropletBatch(tracer:THREE.BufferGeometry){
 const geometry=tracer.clone();
 const opacity=new THREE.InstancedBufferAttribute(new Float32Array(BLOOD_DROPLET_CAPACITY),1);
 opacity.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('dropletOpacity',opacity);
 const material=new THREE.MeshBasicMaterial({color:0xa65a4e,transparent:true,depthTest:true,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float dropletOpacity;\nvarying float vDropletOpacity;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvDropletOpacity=dropletOpacity;');
  shader.fragmentShader='varying float vDropletOpacity;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\ndiffuseColor.a*=vDropletOpacity;');
 };
 material.customProgramCacheKey=()=> 'fieldwork-v4-droplets';
 const mesh=new THREE.InstancedMesh(geometry,material,BLOOD_DROPLET_CAPACITY);
 mesh.count=0;mesh.frustumCulled=false;
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.userData.fieldworkDrawFamily='blood-droplet-batch';
 const temp=new THREE.Object3D();
 let count=0;
 return {mesh,opacity,
  begin(){count=0;},
  add(x:number,y:number,z:number,theta:number,i:number,progress:number,alpha:number){
   if(count>=BLOOD_DROPLET_CAPACITY||alpha<=0)return false;
   temp.position.set(x,y,z);temp.rotation.set(i*.73,theta,Math.PI*.5+progress*1.8);
   temp.scale.set(.9,1.9,.9);temp.updateMatrix();
   mesh.setMatrixAt(count,temp.matrix);opacity.setX(count,alpha);count++;return true;
  },
  finish(){mesh.count=count;if(count){mesh.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;}},
  reset(){count=0;mesh.count=0;},
  dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}
 };
}
