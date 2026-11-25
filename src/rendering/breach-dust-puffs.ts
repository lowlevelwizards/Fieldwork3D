/** V8: visual-only, deterministic soft dust and flash wisps.
 * No volume simulation, no new event history, no visibility authority.
 * One fixed-capacity billboard batch, view-facing in every camera pass.
 */
import * as THREE from 'three';
import {EffectSlotCache} from './breach-effect-slot-cache.ts';
import {PUFF_LIFE,type PuffKind} from '../breach-atmosphere-evidence.ts';
export type {PuffKind} from '../breach-atmosphere-evidence.ts';
const profiles={
 dust:{count:3,size:10,spread:15,lift:9,alpha:.72,color:0xb8a286},
 wood:{count:2,size:8.5,spread:12,lift:9,alpha:.63,color:0xbda184},
 stone:{count:3,size:10,spread:13,lift:10,alpha:.74,color:0xc5c0b0},
 flash:{count:4,size:15,spread:25,lift:18,alpha:.66,color:0xd0d0c8},
 muzzle:{count:1,size:6.5,spread:5,lift:13,alpha:.47,color:0xaab0aa}
} as const;
export const PUFF_LIMIT=64;
export const puffCount=(kind:PuffKind)=>profiles[kind].count;
export type PuffSample={x:number;y:number;z:number;size:number;alpha:number;color:number;phase:number};
export function samplePuff(kind:PuffKind,id:number,i:number,age:number,x:number,y:number,z:number,out:PuffSample):boolean{
 const p=profiles[kind],life=PUFF_LIFE[kind];
 if(!Number.isFinite(age)||age<0||age>=life||i<0||i>=p.count||!Number.isInteger(i))return false;
 const t=age/life,theta=id*2.399+i*2.094;
 const expansion=1-Math.exp(-t*3.5);
 const d=(2+expansion*p.spread)*(.75+(i%3)*.13);
 out.x=x+Math.cos(theta)*d;out.z=z+Math.sin(theta)*d;
 out.y=Math.max(2,y+p.lift*t+(i%3)*1.5);
 out.size=p.size*(.72+expansion*1.12)*(1+(i%3)*.12);
 out.alpha=p.alpha*(1-t*t)*(1-t*.40);out.color=p.color;out.phase=theta;
 return true;
}
export class DustPuffBatch{
 readonly mesh:THREE.InstancedMesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
 private readonly alphaPhase=new THREE.InstancedBufferAttribute(new Float32Array(PUFF_LIMIT*2),2);
 private readonly tint=new THREE.InstancedBufferAttribute(new Float32Array(PUFF_LIMIT*3),3);
 private readonly color=new THREE.Color();
 private readonly matrix=new THREE.Matrix4();
 private count=0;
 private dirty=false;
 private readonly slots=new EffectSlotCache(PUFF_LIMIT,7);
 private readonly payload=[0,0,0,0,0,0,0];
 constructor(){
  const g=new THREE.PlaneGeometry(2,2);
  this.alphaPhase.setUsage(THREE.DynamicDrawUsage);this.tint.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('puffAlphaPhase',this.alphaPhase);g.setAttribute('puffTint',this.tint);
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,
   vertexShader:`
    attribute vec2 puffAlphaPhase;
    attribute vec3 puffTint;
    varying vec2 vPuff;
    varying vec3 vAlphaOffset;
    varying vec3 vTint;
    void main(){
     vPuff=uv*2.0-1.0;vAlphaOffset=vec3(puffAlphaPhase.x,cos(puffAlphaPhase.y)*.24,sin(puffAlphaPhase.y)*.24);vTint=puffTint;
     vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
     float size=length(instanceMatrix[0].xyz);
     center.xy+=position.xy*size;
     gl_Position=projectionMatrix*center;
    }`,
   fragmentShader:`
    varying vec2 vPuff;
    varying vec3 vAlphaOffset;
    varying vec3 vTint;
    void main(){
     vec2 p=vPuff;
     vec2 offset=vAlphaOffset.yz;
     // Broad uneven cloud lobes, opaque-looking body and soft edge.
     // Small analytic breakup avoids a costly procedural noise loop.
     vec2 axis=normalize(offset+vec2(.0001));
     vec2 across=vec2(-axis.y,axis.x);
     vec2 q=vec2(dot(p,axis),dot(p,across));
     float body=1.0-smoothstep(.33,.80,length(q*vec2(.96,1.15)));
     float lobe=1.0-smoothstep(.21,.56,length(q-vec2(.29,.15)));
     float lobe2=1.0-smoothstep(.18,.52,length(q+vec2(.29,-.14)));
     float grain=sin(q.x*21.0+sin(q.y*13.0)*1.7)*sin(q.y*17.0+q.x*5.0);
     float density=max(body,max(lobe*.88,lobe2*.86));
     float alpha=clamp(density+grain*.12*density,0.0,1.0)*vAlphaOffset.x;
     if(alpha<.012)discard;
     float shade=.77+.23*smoothstep(-.55,.5,q.y)+grain*.055;
     gl_FragColor=vec4(vTint*shade,alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  this.mesh=new THREE.InstancedMesh(g,m,PUFF_LIMIT);
  this.mesh.count=0;this.mesh.frustumCulled=false;
  this.mesh.castShadow=false;this.mesh.receiveShadow=false;
  this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.mesh.userData.fieldworkDrawFamily='vfx-dust-puffs';
 }
 begin(){this.count=0;this.dirty=false;}
 add(p:PuffSample):boolean{
  if(this.count>=PUFF_LIMIT||p.alpha<=0)return false;
  const i=this.count++,a=this.payload;
  a[0]=p.x;a[1]=p.y;a[2]=p.z;a[3]=p.size;a[4]=p.alpha;a[5]=p.color;a[6]=p.phase;
  if(!this.slots.changed(i,a))return true;
  this.dirty=true;
  this.matrix.makeScale(p.size,p.size,p.size).setPosition(p.x,p.y,p.z);
  this.mesh.setMatrixAt(i,this.matrix);
  this.alphaPhase.setXY(i,p.alpha,p.phase);
  this.color.setHex(p.color);this.tint.setXYZ(i,this.color.r,this.color.g,this.color.b);
  return true;
 }
 finish(){this.mesh.count=this.count;if(this.dirty){
  this.mesh.instanceMatrix.needsUpdate=true;this.alphaPhase.needsUpdate=true;this.tint.needsUpdate=true;
 }}
 reset(){this.count=0;this.mesh.count=0;this.dirty=false;this.slots.reset();}
 dispose(){this.reset();this.mesh.removeFromParent();this.mesh.dispose();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
