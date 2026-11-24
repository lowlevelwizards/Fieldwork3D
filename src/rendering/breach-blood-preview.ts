/** V4 preview only: one mixed ground-mark draw and one bounded droplet draw.
 * Existing visibility owner decides which marks/particles are submitted.
 * Resources live with the existing persistent tactical effect root.
 */
import * as THREE from 'three';
import {EffectSlotCache} from './breach-effect-slot-cache.ts';
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
 const styleFor=(surface:string|undefined,x:number,y:number)=>surface==='blood'?stainVariant(x,y):-1;
 return {mesh,texture,style,styleFor,
  setStyle(index:number,surface:string|undefined,x:number,y:number){
   style.setX(index,styleFor(surface,x,y));
  },
  finish(){style.needsUpdate=true;},
  dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();texture.dispose();}
 };
}

export const BLOOD_DROPLET_CAPACITY=80;
export function makeBloodDropletBatch(tracer:THREE.BufferGeometry,capacity=BLOOD_DROPLET_CAPACITY,drawFamily?:string){
 const geometry=tracer.clone();
 const opacity=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
 opacity.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('dropletOpacity',opacity);
 const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthTest:true,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float dropletOpacity;\nvarying float vDropletOpacity;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvDropletOpacity=dropletOpacity;');
  shader.fragmentShader='varying float vDropletOpacity;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\ndiffuseColor.a*=vDropletOpacity;');
 };
 material.customProgramCacheKey=()=> 'fieldwork-v4-droplets';
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);
 mesh.count=0;mesh.frustumCulled=false;
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.userData.fieldworkDrawFamily=drawFamily??(capacity===BLOOD_DROPLET_CAPACITY?'blood-droplet-batch':'material-impact-batch');
 const temp=new THREE.Object3D(),tint=new THREE.Color();
 let count=0,dirty=false;
 const slots=new EffectSlotCache(capacity,10),payload=[0,0,0,0,0,0,0,0,0,0];
 // Allocate the per-instance color buffer once, before first compilation.
 mesh.setColorAt(0,tint.setHex(0xa65a4e));
 mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
 function write(x:number,y:number,z:number,pitch:number,yaw:number,roll:number,width:number,length:number,alpha:number,color:number){
  if(count>=capacity||alpha<=0)return false;
  payload[0]=x;payload[1]=y;payload[2]=z;payload[3]=pitch;payload[4]=yaw;payload[5]=roll;
  payload[6]=width;payload[7]=length;payload[8]=alpha;payload[9]=color;
  if(!slots.changed(count,payload)){count++;return true;}
  dirty=true;
  temp.position.set(x,y,z);temp.rotation.set(pitch,yaw,roll);
  temp.scale.set(width,length,width);temp.updateMatrix();
  mesh.setMatrixAt(count,temp.matrix);mesh.setColorAt(count,tint.setHex(color));
  opacity.setX(count,alpha);count++;return true;
 }
 return {mesh,opacity,addPose:write,
  begin(){count=0;dirty=false;},
  add(x:number,y:number,z:number,theta:number,i:number,progress:number,alpha:number){
   return write(x,y,z,i*.73,theta,Math.PI*.5+progress*1.8,.9,1.9,alpha,0xa65a4e);
  },
  addMaterial(p:{x:number;y:number;z:number;pitch:number;yaw:number;roll:number;width:number;length:number;opacity:number;color:number}){
   return write(p.x,p.y,p.z,p.pitch,p.yaw,p.roll,p.width,p.length,p.opacity,p.color);
  },
  finish(){mesh.count=count;if(dirty){mesh.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;mesh.instanceColor!.needsUpdate=true;}},
  reset(){count=0;mesh.count=0;dirty=false;slots.reset();},
  dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}
 };
}
