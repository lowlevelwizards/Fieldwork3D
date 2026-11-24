/** V8: visual-only, deterministic soft dust and flash wisps.
 * No volume simulation, no new event history, no visibility authority.
 * One fixed-capacity billboard batch, view-facing in every camera pass.
 */
import * as THREE from 'three';
export type PuffKind='dust'|'wood'|'stone'|'flash';
const profiles={
 dust:{count:3,life:.44,size:4.2,spread:11,lift:6,alpha:.25,color:0xb0a797},
 wood:{count:2,life:.40,size:3.5,spread:8,lift:5,alpha:.18,color:0xbf9d77},
 stone:{count:2,life:.36,size:4,spread:10,lift:5,alpha:.24,color:0xaaa8a1},
 flash:{count:4,life:.65,size:8,spread:20,lift:9,alpha:.18,color:0xd2cec3}
} as const;
export const PUFF_LIMIT=64;
export const puffCount=(kind:PuffKind)=>profiles[kind].count;
export type PuffSample={x:number;y:number;z:number;size:number;alpha:number;color:number;phase:number};
export function samplePuff(kind:PuffKind,id:number,i:number,age:number,x:number,y:number,z:number,out:PuffSample):boolean{
 const p=profiles[kind];
 if(!Number.isFinite(age)||age<0||age>=p.life||i<0||i>=p.count||!Number.isInteger(i))return false;
 const t=age/p.life,theta=id*2.399+i*2.094;
 const d=(1+t*p.spread)*(.75+(i%3)*.13);
 out.x=x+Math.cos(theta)*d;out.z=z+Math.sin(theta)*d;
 out.y=Math.max(1,y+p.lift*t);out.size=p.size*(.6+t*1.2);
 out.alpha=p.alpha*(1-t)*(1-t);out.color=p.color;out.phase=theta;
 return true;
}
export class DustPuffBatch{
 readonly mesh:THREE.InstancedMesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
 private readonly alphaPhase=new THREE.InstancedBufferAttribute(new Float32Array(PUFF_LIMIT*2),2);
 private readonly tint=new THREE.InstancedBufferAttribute(new Float32Array(PUFF_LIMIT*3),3);
 private readonly color=new THREE.Color();
 private readonly matrix=new THREE.Matrix4();
 private count=0;
 constructor(){
  const g=new THREE.PlaneGeometry(2,2);
  this.alphaPhase.setUsage(THREE.DynamicDrawUsage);this.tint.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('puffAlphaPhase',this.alphaPhase);g.setAttribute('puffTint',this.tint);
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,
   vertexShader:`
    attribute vec2 puffAlphaPhase;
    attribute vec3 puffTint;
    varying vec2 vPuff;
    varying vec2 vAlphaPhase;
    varying vec3 vTint;
    void main(){
     vPuff=uv*2.0-1.0;vAlphaPhase=puffAlphaPhase;vTint=puffTint;
     vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
     float size=length(instanceMatrix[0].xyz);
     center.xy+=position.xy*size;
     gl_Position=projectionMatrix*center;
    }`,
   fragmentShader:`
    varying vec2 vPuff;
    varying vec2 vAlphaPhase;
    varying vec3 vTint;
    void main(){
     vec2 p=vPuff;
     vec2 offset=vec2(cos(vAlphaPhase.y),sin(vAlphaPhase.y))*.24;
     float body=max(1.0-length(p)*1.35,0.0);
     float lobe=max(1.0-length(p-offset)*1.7,0.0);
     float alpha=max(body*body,lobe*lobe*.75)*vAlphaPhase.x;
     if(alpha<.003)discard;
     gl_FragColor=vec4(vTint,alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  this.mesh=new THREE.InstancedMesh(g,m,PUFF_LIMIT);
  this.mesh.count=0;this.mesh.frustumCulled=false;
  this.mesh.castShadow=false;this.mesh.receiveShadow=false;
  this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.mesh.userData.fieldworkDrawFamily='vfx-dust-puffs';
 }
 begin(){this.count=0;}
 add(p:PuffSample):boolean{
  if(this.count>=PUFF_LIMIT||p.alpha<=0)return false;
  const i=this.count++;
  this.matrix.makeScale(p.size,p.size,p.size).setPosition(p.x,p.y,p.z);
  this.mesh.setMatrixAt(i,this.matrix);
  this.alphaPhase.setXY(i,p.alpha,p.phase);
  this.color.setHex(p.color);this.tint.setXYZ(i,this.color.r,this.color.g,this.color.b);
  return true;
 }
 finish(){this.mesh.count=this.count;if(this.count){
  this.mesh.instanceMatrix.needsUpdate=true;this.alphaPhase.needsUpdate=true;this.tint.needsUpdate=true;
 }}
 reset(){this.count=0;this.mesh.count=0;}
 dispose(){this.reset();this.mesh.removeFromParent();this.mesh.dispose();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
