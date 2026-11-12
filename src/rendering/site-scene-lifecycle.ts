/** C1: Dispose only resources belonging to the outgoing SITE graph.
 * Called after static batches detach their own instance buffers. The live
 * Three.js renderer, cameras, effects, actor rigs, and retained fog instances
 * are NOT owned by this function.
 *
 * A site geometry can appear on several meshes; release it exactly once.
 * InstancedMesh owns its instance buffer independently of its geometry:
 * it must receive dispose() even when its geometry is persistent/shared.
 * Line/Points geometry (e.g. door-swing planning arcs) is site-owned too.
 * Material ownership is explicitly separate (siteMaterials, wallMaterials,
 * patina arrays, and persistent palette caches); never dispose it here.
 */
import * as THREE from 'three';

export type SiteSceneReleaseStats={
  children:number;geometries:number;instances:number
};

export function releaseSiteSceneObjects(
  root:THREE.Object3D,
  retained:ReadonlySet<THREE.Object3D>,
  sharedGeometries:ReadonlySet<THREE.BufferGeometry>
):SiteSceneReleaseStats{
  const geometries=new Set<THREE.BufferGeometry>();
  const instances=new Set<THREE.InstancedMesh>();
  let children=0;
  for(const child of [...root.children]){
    if(retained.has(child))continue;
    child.traverse(node=>{
      if(node instanceof THREE.InstancedMesh)instances.add(node);
      if(node instanceof THREE.Mesh||
         node instanceof THREE.Line||
         node instanceof THREE.Points){
        const geometry=node.geometry;
        if(geometry instanceof THREE.BufferGeometry&&
           !sharedGeometries.has(geometry))geometries.add(geometry);
      }
    });
    root.remove(child);children++;
  }
  // Do not pass shared materials or geometry to InstancedMesh.dispose.
  for(const instance of instances)instance.dispose();
  for(const geometry of geometries)geometry.dispose();
  return {children,geometries:geometries.size,instances:instances.size};
}
