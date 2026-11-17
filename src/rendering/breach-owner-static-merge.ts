/** E6.18: cheap, build-time static micro-merges INSIDE the same owner.
 * Never crosses a visibility/disclosure or door-interaction boundary.
 * Existing site-wide instancing always runs before this last-mile pass.
 */
import * as THREE from 'three';
import {consolidateStaticFixtureParts} from './breach-fixture-draw-batching.ts';

export type OwnerMergeSiteStats=Readonly<{
 ownerGroups:number;sourceMeshes:number;mergedMeshes:number;
 avoidedDraws:number
}>;
type Detail={obj:THREE.Object3D};
type Door={frame:THREE.Group;threshold:THREE.Object3D;
 wedge:THREE.Object3D};

export function consolidateOwnedStaticSiteDetails(
 observedDetails:readonly Detail[],
 doors:ReadonlyMap<string,Door>
):OwnerMergeSiteStats{
 let ownerGroups=0,sourceMeshes=0,mergedMeshes=0;
 // Decorative groups have independent operator-cone visibility. Preserve
 // group transforms, sorting, labels and every translucent/sign mesh.
 for(const {obj} of observedDetails){
  const result=consolidateStaticFixtureParts(obj,{recursive:false});
  if(result.avoided>0){
   ownerGroups++;sourceMeshes+=result.original;
   mergedMeshes+=result.batched;
  }
 }
 // Do not merge an interactive threshold/wedge or any descendants of
 // dynamic leaf/hinge groups. The frame owns the cutaway/reveal semantics.
 for(const door of doors.values()){
  const result=consolidateStaticFixtureParts(door.frame,{
   recursive:false,exclude:new Set([door.threshold,door.wedge])
  });
  if(result.avoided>0){
   ownerGroups++;sourceMeshes+=result.original;
   mergedMeshes+=result.batched;
  }
 }
 return {ownerGroups,sourceMeshes,mergedMeshes,
  avoidedDraws:sourceMeshes-mergedMeshes};
}
