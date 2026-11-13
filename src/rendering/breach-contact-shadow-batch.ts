/** Shared GPU draw for independent operator foot-contact shadows.
 * These are purely cosmetic overlay instances, never collision/shadow-map
 * authority. Proxy meshes preserve each foot's exact authored transform.
 * A hidden/unobserved owner contributes a zero-scale instance.
 */
import * as THREE from 'three';

const HIDDEN=new THREE.Matrix4().makeScale(0,0,0);
const BUFFERED_SHADOWS=192;
export class BreachContactShadowBatch{
 readonly geometry=new THREE.CircleGeometry(7,14);
 readonly material=new THREE.MeshBasicMaterial({
  color:0x0b1515,transparent:true,opacity:.20,depthWrite:false
 });
 readonly draw=new THREE.InstancedMesh(this.geometry,this.material,BUFFERED_SHADOWS);
 private readonly registered=new Map<string,[THREE.Mesh,THREE.Mesh]>();
 private readonly scratch=new THREE.Matrix4();
 private readonly last=new Float32Array(BUFFERED_SHADOWS*16);
 private lastCount=0;
 private dirty=true;
 constructor(scene:THREE.Scene){
  this.draw.name='operator-contact-shadows-batched';
  this.draw.frustumCulled=false;
  this.draw.castShadow=false;
  this.draw.count=0;
  this.draw.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(this.draw);
 }
 register(id:string):[THREE.Mesh,THREE.Mesh]{
  const existing=this.registered.get(id);
  if(existing)return existing;
  const make=()=>{
   const mesh=new THREE.Mesh(this.geometry,this.material);
   mesh.rotation.x=-Math.PI/2;mesh.position.y=.15;
   return mesh;
  };
  const result:[THREE.Mesh,THREE.Mesh]=[make(),make()];
  this.registered.set(id,result);this.dirty=true;
  return result;
 }
 unregister(id:string):void{
  if(this.registered.delete(id))this.dirty=true;
 }
 /** Always writes the current, independently disclosed feet in stable order.
  * Instanced geometry does not inherit a proxy mesh's parent visibility.
  */
 sync():void{
  let slot=0,changed=this.dirty;
  for(const pair of this.registered.values())for(const proxy of pair){
   if(slot>=BUFFERED_SHADOWS)break;
   if(proxy.visible){
    proxy.updateMatrix();
    this.scratch.copy(proxy.matrix);
   }else this.scratch.copy(HIDDEN);
   const e=this.scratch.elements,offset=slot*16;
   let different=this.dirty;
   if(!different)for(let k=0;k<16;k++)
    if(this.last[offset+k]!==e[k]){different=true;break;}
   if(different){
    this.draw.setMatrixAt(slot,this.scratch);
    for(let k=0;k<16;k++)this.last[offset+k]=e[k];
    changed=true;
   }
   slot++;
  }
  if(this.draw.count!==slot){this.draw.count=slot;changed=true;}
  if(changed)this.draw.instanceMatrix.needsUpdate=true;
  this.lastCount=slot;this.dirty=false;
 }
 get stats(){return {draws:this.draw.count?1:0,instances:this.draw.count,
  trackedOperators:this.registered.size};}
 dispose(scene:THREE.Scene):void{
  scene.remove(this.draw);this.draw.dispose();
  this.geometry.dispose();this.material.dispose();
  this.registered.clear();
 }
}
