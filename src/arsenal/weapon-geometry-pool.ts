/** E6.26 — exact-buffer geometry reuse for Arsenal's immutable modular gun parts.
 *
 * Build-time only. The actual weapon builder remains the single source of art
 * and of stock / muzzle / hand-contact geometry. This pool does not merge
 * different named parts or touch per-operator motion, attachments, materials,
 * userData, mount anchors, picking, or gameplay.
 *
 * A hash is only a bucket hint: every shared byte is verified before adopting.
 * The pool is owned by one viewer / renderer lifetime, never a global GPU cache.
 */
import * as THREE from 'three';

type Entry={geometry:THREE.BufferGeometry;signature:string;leases:number;retired:boolean};
type Part=THREE.Mesh<THREE.BufferGeometry,THREE.Material>;
const partName=/^family-(?:receiver|barrel|handguard|stock|grip|magazine)-/;
function isRigidPart(node:THREE.Object3D):node is Part{
 if(!(node instanceof THREE.Mesh)||
   node instanceof THREE.InstancedMesh||node instanceof THREE.SkinnedMesh||
   !partName.test(node.name)||node.children.length||
   node.customDepthMaterial||node.customDistanceMaterial||
   node.morphTargetInfluences?.length||
   !(node.geometry instanceof THREE.BufferGeometry)||
   !(node.material instanceof THREE.MeshStandardMaterial))return false;
 const m=node.material;
 if(m.transparent||m.opacity!==1||m.alphaTest!==0||
   m.blending!==THREE.NormalBlending||!m.depthWrite)return false;
 const g=node.geometry;
 if(Object.keys(g.morphAttributes).length||!g.getAttribute('position')||
   Object.keys(g.userData).length)return false;
 return [g.index,...Object.values(g.attributes)].every(a=>
   a===null||(a instanceof THREE.BufferAttribute&&
    a.usage===THREE.StaticDrawUsage));
}
function views(g:THREE.BufferGeometry):Uint8Array[]{
 const attrs=Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b));
 const list=[g.index,...attrs.map(([,a])=>a)].filter(
  (x):x is THREE.BufferAttribute=>x instanceof THREE.BufferAttribute);
 return list.map(a=>new Uint8Array(a.array.buffer,
  a.array.byteOffset,a.array.byteLength));
}
function metadata(g:THREE.BufferGeometry):string{
 const attrs=Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b));
 const describe=(a:THREE.BufferAttribute)=>
  [a.array.constructor.name,a.itemSize,a.count,a.normalized,a.usage].join(':');
 return [g.type,g.drawRange.start,g.drawRange.count,
  JSON.stringify(g.groups),g.index?describe(g.index):'no-index',
  ...attrs.map(([name,a])=>name+':'+describe(a as THREE.BufferAttribute))].join('|');
}
function fingerprint(g:THREE.BufferGeometry):string{
 let h=2166136261;
 for(const v of views(g))for(const b of v)
  h=Math.imul(h^b,16777619);
 return metadata(g)+'#'+(h>>>0).toString(16);
}
function equal(a:THREE.BufferGeometry,b:THREE.BufferGeometry){
 if(metadata(a)!==metadata(b))return false;
 const av=views(a),bv=views(b);
 if(av.length!==bv.length)return false;
 for(let i=0;i<av.length;i++){
  if(av[i].length!==bv[i].length)return false;
  for(let k=0;k<av[i].length;k++)
   if(av[i][k]!==bv[i][k])return false;
 }
 return true;
}
/** Geometry-only, exact-content dedup. Safe to opt out without altering art. */
export class ArsenalWeaponGeometryPool{
 private readonly buckets=new Map<string,Entry[]>();
 private readonly all=new Set<Entry>();
 private readonly owners=new WeakMap<THREE.Group,Set<Entry>>();
 private hits=0;private misses=0;private evictions=0;
 private readonly budget:number;
 constructor(budget=512){
  if(!Number.isInteger(budget)||budget<1)
   throw Error('Weapon geometry cache budget must be positive');
  this.budget=budget;
 }
 adopt(root:THREE.Group){
  if(this.owners.has(root))throw Error('Weapon owner already adopted');
  const grouped=new Map<THREE.BufferGeometry,THREE.Mesh[]>();
  root.traverse(node=>{
   if(!(node instanceof THREE.Mesh))return;
   const list=grouped.get(node.geometry)??[];
   list.push(node);grouped.set(node.geometry,list);
  });
  const leases=new Set<Entry>();
  for(const [geometry,consumers] of grouped){
   // Do not pool a buffer if any consumer needs to mutate it or if the
   // geometry is used by both a static and a specialized / animated mesh.
   if(!consumers.every(isRigidPart))continue;
   const key=fingerprint(geometry);
   const bucket=this.buckets.get(key)??[];
   let entry=bucket.find(item=>equal(item.geometry,geometry));
   if(entry){
    this.hits++;
    // LRU: a re-used part belongs at the back of the eviction queue.
    this.all.delete(entry);this.all.add(entry);
    if(entry.geometry!==geometry){
     for(const mesh of consumers)mesh.geometry=entry.geometry;
     geometry.dispose();
    }
   }else{
    if(this.all.size>=this.budget&&!this.evictOldestIdle())continue;
    entry={geometry,signature:key,leases:0,retired:false};
    bucket.push(entry);this.buckets.set(key,bucket);
    this.all.add(entry);this.misses++;
   }
   if(!leases.has(entry)){entry.leases++;leases.add(entry);}
  }
  this.owners.set(root,leases);
  return this.stats();
 }
 release(root:THREE.Group){
  const leased=this.owners.get(root);
  if(!leased)throw Error('Weapon owner not adopted');
  this.owners.delete(root);
  const pooled=new Set([...this.all].map(e=>e.geometry));
  const standalone=new Set<THREE.BufferGeometry>();
  root.traverse(node=>{
   // Instanced rails/ribs stay unpooled and need their per-instance GPU
   // resources released when a Workbench owner is retired.
   if(node instanceof THREE.InstancedMesh)node.dispose();
   if(node instanceof THREE.Mesh&&!pooled.has(node.geometry))
    standalone.add(node.geometry);
  });
  for(const geometry of standalone)geometry.dispose();
  root.clear();
  for(const entry of leased){
   entry.leases--;
   if(entry.leases<0)throw Error('Weapon geometry lease underflow');
   if(entry.retired&&entry.leases===0)this.retire(entry);
  }
 }
 private retire(entry:Entry){
  entry.geometry.dispose();this.all.delete(entry);
 }
 private evictOldestIdle():boolean{
  for(const entry of this.all){
   if(entry.leases!==0||entry.retired)continue;
   const bucket=this.buckets.get(entry.signature);
   if(!bucket)continue;
   const remaining=bucket.filter(item=>item!==entry);
   if(remaining.length)this.buckets.set(entry.signature,remaining);
   else this.buckets.delete(entry.signature);
   entry.retired=true;this.retire(entry);this.evictions++;
   return true;
  }
  return false;
 }
 /** Drop idle geometry before saturating the budget. Live owners are untouched. */
 evictIdle(){
  for(const [key,bucket] of [...this.buckets]){
   const retained:Entry[]=[];
   for(const entry of bucket){
    if(entry.leases>0)retained.push(entry);
    else{entry.retired=true;this.retire(entry);this.evictions++;}
   }
   if(retained.length)this.buckets.set(key,retained);
   else this.buckets.delete(key);
  }
 }
 clear(){
  this.buckets.clear();
  for(const entry of [...this.all]){
   entry.retired=true;
   if(entry.leases===0)this.retire(entry);
  }
 }
 stats(){
  return {geometries:this.all.size,activeLeases:
   [...this.all].reduce((n,e)=>n+e.leases,0),
   hits:this.hits,misses:this.misses,evictions:this.evictions,
   budget:this.budget};
 }
}
