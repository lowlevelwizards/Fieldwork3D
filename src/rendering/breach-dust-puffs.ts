/** V8: visual-only, deterministic soft dust and flash wisps.
 * No volume simulation, no new event history, no visibility authority.
 * One fixed-capacity billboard batch, view-facing in every camera pass.
 */
import * as THREE from 'three';
import {EffectSlotCache} from './breach-effect-slot-cache.ts';
import {PUFF_LIFE,type PuffKind} from '../breach-atmosphere-evidence.ts';
export type {PuffKind} from '../breach-atmosphere-evidence.ts';
const profiles={
 dust:{count:2,size:13,spread:17,lift:5,alpha:.70,color:0xd2bb99},
 wood:{count:2,size:11,spread:13,lift:5,alpha:.63,color:0xc9ae87},
 stone:{count:2,size:13,spread:15,lift:6,alpha:.72,color:0xd5c3aa},
 flash:{count:3,size:19,spread:23,lift:21,alpha:.64,color:0x77828e},
 muzzle:{count:1,size:8.5,spread:5,lift:16,alpha:.47,color:0x707d89}
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
 out.y=Math.max(2,y+p.lift*t+(i%3)*1.5-(kind==='dust'||kind==='wood'||kind==='stone'?8*t*t:0));
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
     float body=1.0-smoothstep(.48,.86,length(q));
     float lobe=1.0-smoothstep(.30,.60,length(q-vec2(.30,.12)));
     float density=max(body,lobe*.88);
     float alpha=density*vAlphaOffset.x;
     if(alpha<.012)discard;
     float shade=.85+.15*smoothstep(-.55,.5,q.y);
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
