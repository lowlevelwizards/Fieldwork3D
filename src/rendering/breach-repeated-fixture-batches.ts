/** Opt-in repeated fixture instancing. Strictly cosmetic and owner-scoped.
 * Each cover can move, collapse, or be concealed independently. Animated
 * limbs/doors, wear decals, and unique per-vertex AO are never collected.
 */
import * as THREE from 'three';

type Candidate={index:number;mesh:THREE.Mesh;owner:THREE.Group;
 phase:THREE.Group;geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial};
type Batch={mesh:THREE.InstancedMesh;active:number};
type Entry={candidate:Candidate;batch:Batch;slot:number;
 visible:boolean;matrix:THREE.Matrix4};
const hidden=new THREE.Matrix4().makeScale(0,0,0);
const scratch=new THREE.Matrix4();
function geometryEqual(a:THREE.BufferGeometry,b:THREE.BufferGeometry):boolean{
 if(a===b)return true;
 const names=Object.keys(a.attributes).sort();
 if(names.length!==Object.keys(b.attributes).length||a.index?.count!==b.index?.count)return false;
 for(const name of names){
  const x=a.getAttribute(name),y=b.getAttribute(name);
  if(!y||x.itemSize!==y.itemSize||x.count!==y.count||
    x.normalized!==y.normalized||
    !(x instanceof THREE.BufferAttribute)||
    !(y instanceof THREE.BufferAttribute))return false;
  for(let i=0,n=x.count*x.itemSize;i<n;i++)
   if(x.array[i]!==y.array[i])return false;
 }
 if(a.index)for(let i=0;i<a.index.count;i++)
  if(a.index.getX(i)!==b.index!.getX(i))return false;
 return true;
}
function geometryHint(g:THREE.BufferGeometry):string{
 return Object.keys(g.attributes).sort().map(k=>{
  const a=g.getAttribute(k);
  return k+':'+a.count+':'+a.itemSize;
 }).join('/')+':'+(g.index?.count??0);
}
export class RepeatedFixtureBatches{
 private readonly candidates:Candidate[]=[];
 private readonly byIndex=new Map<number,Entry[]>();
 private readonly batches:Batch[]=[];
 private readonly discarded=new Set<THREE.BufferGeometry>();
 private originalMeshes=0;
 get stats(){return {original:this.originalMeshes,batches:this.batches.length,
  saved:this.originalMeshes-this.batches.length};}
 collect(index:number,owner:THREE.Group,phase:THREE.Group):void{
  for(const child of phase.children){
   if(!(child instanceof THREE.Mesh)||child instanceof THREE.InstancedMesh||
    child.children.length||!child.visible||child.renderOrder!==0||
    Object.keys(child.userData).length>0||
    !(child.material instanceof THREE.MeshStandardMaterial)||
    child.material.transparent||child.geometry.userData.fieldworkLightingPartSpans||
    child.customDepthMaterial||child.customDistanceMaterial)continue;
   this.candidates.push({index,owner,phase,mesh:child,
    material:child.material,geometry:child.geometry});
  }
 }
 flush(root:THREE.Group,
  shared:ReadonlySet<THREE.BufferGeometry>=new Set()):void{
  root.updateWorldMatrix(true,true);
  const buckets=new Map<string,Candidate[]>();
  for(const c of this.candidates){
   const mesh=c.mesh,geo=c.geometry;
   const key=[c.material.uuid,geometryHint(geo),mesh.castShadow,
    mesh.receiveShadow,mesh.layers.mask,mesh.frustumCulled].join('|');
   const list=buckets.get(key)??[];list.push(c);buckets.set(key,list);
  }
  for(const list of buckets.values()){
   // A geometry shape may collide in the cheap key. Pairwise exact
   // comparison is required before two meshes can share a GPU buffer.
   const unmatched=[...list];
   while(unmatched.length){
    const leader=unmatched.shift()!;
    const matching=[leader];
    for(let i=unmatched.length-1;i>=0;i--)
     if(geometryEqual(leader.geometry,unmatched[i].geometry))
      matching.push(unmatched.splice(i,1)[0]);
    if(matching.length<2)continue;
    const first=leader.mesh;
    const instanced=new THREE.InstancedMesh(leader.geometry,
      leader.material,matching.length);
    instanced.castShadow=first.castShadow;
    instanced.receiveShadow=first.receiveShadow;
    instanced.layers.mask=first.layers.mask;
    instanced.frustumCulled=false;
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const batch:Batch={mesh:instanced,active:0};
    for(const [slot,c] of matching.entries()){
     const visible=c.owner.visible&&c.phase.visible;
     const matrix=c.mesh.matrixWorld.clone();
     instanced.setMatrixAt(slot,visible?matrix:hidden);
     if(visible)batch.active++;
     const entries=this.byIndex.get(c.index)??[];
     entries.push({candidate:c,batch,slot,visible,matrix});
     this.byIndex.set(c.index,entries);
     c.phase.remove(c.mesh);
     if(c.geometry!==leader.geometry)this.discarded.add(c.geometry);
    }
    instanced.instanceMatrix.needsUpdate=true;
    instanced.visible=batch.active>0;
    root.add(instanced);this.batches.push(batch);
    this.originalMeshes+=matching.length;
   }
  }
  this.candidates.length=0;
  // Only unique duplicate geometries detached from their owner may be
  // disposed; reusable box geometries belong to the site's shared cache.
  for(const duplicate of this.discarded)if(!shared.has(duplicate))
   duplicate.dispose();
  this.discarded.clear();
 }
 /** Only called when an object's transform changes or visibility flips.
  * Fog may change every frame; unchanged instances incur zero GPU uploads.
  */
 sync(index:number,moved=false):void{
  const entries=this.byIndex.get(index);
  if(!entries)return;
  if(moved)entries[0].candidate.owner.updateWorldMatrix(true,true);
  for(const item of entries){
   const c=item.candidate;
   const visible=c.owner.visible&&c.phase.visible;
   if(!moved&&visible===item.visible)continue;
   if(moved){
    scratch.multiplyMatrices(c.phase.matrixWorld,c.mesh.matrix);
    item.matrix.copy(scratch);
   }
   if(item.visible!==visible)item.batch.active+=visible?1:-1;
   item.visible=visible;
   item.batch.mesh.setMatrixAt(item.slot,visible?item.matrix:hidden);
   item.batch.mesh.instanceMatrix.needsUpdate=true;
   item.batch.mesh.visible=item.batch.active>0;
  }
 }
 clear():void{
  for(const batch of this.batches)batch.mesh.dispose();
  this.candidates.length=0;this.byIndex.clear();
  this.batches.length=0;this.discarded.clear();this.originalMeshes=0;
 }
}
