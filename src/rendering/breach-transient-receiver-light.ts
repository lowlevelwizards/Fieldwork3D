/** V17.3c: renderer-owned directional diffuse extension. The actual
 * point lights stay conservatively confined for every material. Only the
 * already-composed graphic-world shader receives the additional reach.
 * No geometry, light, shadow-map, per-event program, or global shader edit.
 */
import * as THREE from 'three';
import type {Door,Pt,Segment} from '../breach-core.ts';
import {fillTransientLightReach,TRANSIENT_LIGHT_SECTORS,type TransientLightWorld}
 from './breach-transient-light-geometry.ts';

export class TransientReceiverLight{
 private readonly bytes=new Uint8Array(TRANSIENT_LIGHT_SECTORS*2);
 private readonly scratch=new Float32Array(TRANSIENT_LIGHT_SECTORS);
 readonly texture=new THREE.DataTexture(this.bytes,TRANSIENT_LIGHT_SECTORS,2,THREE.RedFormat,THREE.UnsignedByteType);
 readonly sources=[new THREE.Vector4(),new THREE.Vector4()];
 /** x = normalized event strength, y = safe physical point-light radius. */
 readonly strengths=[new THREE.Vector2(),new THREE.Vector2()];
 private dirty=false;
 constructor(){
  this.texture.name='V17 transient directional reach';
  this.texture.minFilter=THREE.NearestFilter;this.texture.magFilter=THREE.NearestFilter;
  this.texture.generateMipmaps=false;this.texture.needsUpdate=true;
 }
 begin(){for(const strength of this.strengths)strength.set(0,0);}
 offer(channel:0|1,world:TransientLightWorld,doors:readonly Door[],p:Pt,height:number,range:number,safe:number,strength:number,coveringSegments:readonly Segment[]=[]){
  if(!Number.isFinite(height)||!Number.isFinite(safe)||!Number.isFinite(strength)||strength<=0||safe>=range)return;
  if(!fillTransientLightReach(world,doors,p,range,this.scratch,coveringSegments))return;
  let extendsRange=false;
  const offset=channel*TRANSIENT_LIGHT_SECTORS;
  for(let i=0;i<TRANSIENT_LIGHT_SECTORS;i++){
   const value=Math.floor(Math.max(0,Math.min(1,this.scratch[i]/range))*255);
   if(value*range/255>safe+1)extendsRange=true;
   if(this.bytes[offset+i]!==value){this.bytes[offset+i]=value;this.dirty=true;}
  }
  if(!extendsRange)return;
  this.sources[channel].set(p.x,height,p.y,range);
  this.strengths[channel].set(Math.min(1,strength),Math.max(0,safe));
 }
 finish(){if(this.dirty){this.texture.needsUpdate=true;this.dirty=false;}}
 dispose(){this.begin();this.texture.dispose();}
}
const receivers=new WeakMap<THREE.WebGLRenderer,TransientReceiverLight>();
export function registerTransientReceiverLight(renderer:THREE.WebGLRenderer,receiver:TransientReceiverLight){
 receivers.set(renderer,receiver);
}
const header=`
uniform sampler2D fwTransientReach;
uniform vec4 fwTransientSources[2];
uniform vec2 fwTransientStrengths[2];
vec3 fwTransientContribution(vec4 source,vec2 strength,float row,vec3 tint,vec3 positionWorld,vec3 surfaceNormal){
 if(strength.x<=0.0)return vec3(0.0);
 vec3 delta=positionWorld-source.xyz;
 float distance3=length(delta);
 if(distance3>=source.w)return vec3(0.0);
 float horizontal=length(delta.xz);
 float angle=atan(delta.z,delta.x);
 float sector=floor(fract(angle/6.28318530718+1.0)*64.0);
 float reach=texture2D(fwTransientReach,vec2((sector+.5)/64.0,row)).r*source.w;
 if(horizontal>=reach)return vec3(0.0);
 float edge=clamp((reach-horizontal)/2.0,0.0,1.0);
 float outsideSphere=smoothstep(max(0.0,strength.y-2.0),strength.y+2.0,distance3);
 vec3 toLight=normalize((viewMatrix*vec4(-delta,0.0)).xyz+vec3(0.0,.00001,0.0));
 float facing=max(0.0,dot(surfaceNormal,toLight));
 float falloff=max(0.0,1.0-distance3/source.w);
 return tint*strength.x*falloff*falloff*edge*outsideSphere*facing*1.35;
}
`;
const contribution=`
 if(fwTransientStrengths[0].x>0.0||fwTransientStrengths[1].x>0.0){
  vec3 fwReceiverWorld=cameraPosition+transpose(mat3(viewMatrix))*(-vViewPosition);
  reflectedLight.directDiffuse+=diffuseColor.rgb*(
   fwTransientContribution(fwTransientSources[0],fwTransientStrengths[0],.25,vec3(1.0,.66,.36),fwReceiverWorld,normal)+
   fwTransientContribution(fwTransientSources[1],fwTransientStrengths[1],.75,vec3(1.0,.89,.68),fwReceiverWorld,normal));
 }
`;
export function injectTransientReceiverLight(shader:{fragmentShader:string;uniforms:Record<string,{value:any}>},renderer:THREE.WebGLRenderer):boolean{
 const receiver=receivers.get(renderer),needle='#include <lights_fragment_end>';
 if(!receiver||!shader.fragmentShader.includes(needle))return false;
 shader.uniforms.fwTransientReach={value:receiver.texture};
 shader.uniforms.fwTransientSources={value:receiver.sources};
 shader.uniforms.fwTransientStrengths={value:receiver.strengths};
 shader.fragmentShader=header+shader.fragmentShader.replace(needle,needle+'\n'+contribution);
 return true;
}
