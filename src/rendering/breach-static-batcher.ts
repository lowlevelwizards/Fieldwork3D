/** P6.1: Conservative static-box instancing across individually visible
 * decorative props and fixed door frames.
 *
 * Owner-level visibility is preserved by hiding only that owner's instances.
 * Moving leaves, thresholds, glass, wear overlays, cutaway walls, animated
 * furniture and non-shared geometries are NEVER collected.
 */
import * as THREE from 'three';

type Candidate={owner:THREE.Object3D;mesh:THREE.Mesh;
  parent:THREE.Object3D;matrix:THREE.Matrix4};
type Batch={mesh:THREE.InstancedMesh;active:number;total:number};
type Instance={batch:Batch;index:number;matrix:THREE.Matrix4;visible:boolean};
const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
export class StaticSceneBatches{
  private readonly eligible:Candidate[]=[];
  private readonly owners=new Map<THREE.Object3D,Instance[]>();
  private readonly batches:Batch[]=[];
  originalMeshes=0;
  instancedMeshes=0;
  drawCallsAvoided=0;
  /** Only direct, opaque, simple boxes from explicitly approved ownership
   * domains. Full world matrices are captured before detaching the meshes. */
  collect(owner:THREE.Object3D,parent:THREE.Object3D,
      sharedGeometries:ReadonlySet<THREE.BufferGeometry>,
      exclude:ReadonlySet<THREE.Object3D>=new Set()){
    for(const child of [...parent.children]){
      if(!(child instanceof THREE.Mesh)||
         child instanceof THREE.InstancedMesh||
         exclude.has(child)||!child.visible||
         child.children.length||child.userData.patinaMaterial||
         child.customDepthMaterial||child.customDistanceMaterial||
         !(child.material instanceof THREE.MeshStandardMaterial)||
         child.material.transparent||!sharedGeometries.has(child.geometry))continue;
      this.eligible.push({owner,parent,mesh:child,
        matrix:child.matrixWorld.clone()});
    }
  }
  flush(root:THREE.Object3D){
    const groups=new Map<string,Candidate[]>();
    for(const candidate of this.eligible){
      const mesh=candidate.mesh;
      const key=[mesh.geometry.uuid,mesh.material.uuid,
        mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,
        mesh.layers.mask].join('/');
      const entries=groups.get(key)??[];
      entries.push(candidate);groups.set(key,entries);
    }
    for(const entries of groups.values()){
      if(entries.length<2)continue;
      const example=entries[0].mesh;
      const mesh=new THREE.InstancedMesh(example.geometry,
        example.material as THREE.Material,entries.length);
      mesh.castShadow=example.castShadow;
      mesh.receiveShadow=example.receiveShadow;
      mesh.renderOrder=example.renderOrder;
      mesh.layers.mask=example.layers.mask;
      mesh.frustumCulled=false; // owner-level visibility uses matrix masks
      const batch:Batch={mesh,active:0,total:entries.length};
      for(const [index,entry] of entries.entries()){
        const active=entry.owner.visible;
        mesh.setMatrixAt(index,active?entry.matrix:hiddenMatrix);
        if(active)batch.active++;
        const instances=this.owners.get(entry.owner)??[];
        instances.push({batch,index,matrix:entry.matrix,visible:active});
        this.owners.set(entry.owner,instances);
        entry.parent.remove(entry.mesh);
      }
      mesh.instanceMatrix.needsUpdate=true;
      mesh.visible=batch.active>0;
      root.add(mesh);
      this.batches.push(batch);
      this.originalMeshes+=entries.length;this.instancedMeshes++;
    }
    this.drawCallsAvoided=this.originalMeshes-this.instancedMeshes;
    this.eligible.length=0;
  }
  setVisible(owner:THREE.Object3D,visible:boolean){
    const instances=this.owners.get(owner);
    if(!instances)return;
    for(const instance of instances){
      if(instance.visible===visible)continue;
      instance.visible=visible;
      const batch=instance.batch;
      batch.mesh.setMatrixAt(instance.index,
        visible?instance.matrix:hiddenMatrix);
      batch.mesh.instanceMatrix.needsUpdate=true;
      batch.active+=visible?1:-1;
      batch.mesh.visible=batch.active>0;
    }
  }
  stats(){return {original:this.originalMeshes,instances:this.instancedMeshes,
    avoided:this.drawCallsAvoided};}
  clear(){
    for(const batch of this.batches)batch.mesh.parent?.remove(batch.mesh);
    this.batches.length=0;this.eligible.length=0;this.owners.clear();
    this.originalMeshes=0;this.instancedMeshes=0;this.drawCallsAvoided=0;
  }
}
