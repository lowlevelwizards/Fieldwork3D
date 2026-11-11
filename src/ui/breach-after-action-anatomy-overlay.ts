/** V4-4: deliberately SCHEMATIC highlight bands on the authentic 3D rig.
 * Evidence attaches to named anatomical mesh groups already authored by the
 * one live pose pipeline, not to a guessed world-space bullet entry point.
 * Each band is constructed once with its rig; no new renderer/animation writer.
 */
import * as THREE from 'three';
import type {OperatorRig} from '../breach-operator-rig.ts';
import type {ForensicEvidence,ForensicSlot}
 from '../breach-forensic-evidence.ts';

export type ForensicModelOverlay={
 update:(evidence:ForensicEvidence|null)=>void;
};
export const FORENSIC_SLOTS:readonly ForensicSlot[]=[
 'head','torso','arm-left','arm-right','leg-left','leg-right'
];
/** Operator rig family anchors: arms[0]/feet[0] are left, [1] are right.
 * Those indices are also the canonical garment-fit anchor ordering.
 */
export function createForensicModelOverlay(rig:OperatorRig):ForensicModelOverlay{
 const slots=new Map<ForensicSlot,THREE.LineSegments>();
 const attach=(slot:ForensicSlot,parent:THREE.Object3D,
  dimensions:[number,number,number],center:[number,number,number])=>{
   const geometry=new THREE.EdgesGeometry(
     new THREE.BoxGeometry(...dimensions));
   const material=new THREE.LineBasicMaterial({
     color:0xe4b568,transparent:true,opacity:.7,
     depthTest:false,depthWrite:false
   });
   const mesh=new THREE.LineSegments(geometry,material);
   mesh.name='after-action-evidence-'+slot;
   mesh.position.set(...center);
   mesh.renderOrder=200;
   mesh.visible=false;
   // Parent is an existing animated bone or chest/head rig group;
   // overlays follow the same writer without modifying its transform.
   parent.add(mesh);slots.set(slot,mesh);
 };
 attach('head',rig.head,[12,12,11],[0,3,0]);
 attach('torso',rig.chest,[15,17,18],[0,0,0]);
 attach('arm-left',rig.arms[0].upper,[5.8,10.8,5.8],[0,0,0]);
 attach('arm-right',rig.arms[1].upper,[5.8,10.8,5.8],[0,0,0]);
 attach('leg-left',rig.feet[0].upper,[6.3,12,6.3],[0,0,0]);
 attach('leg-right',rig.feet[1].upper,[6.3,12,6.3],[0,0,0]);
 return {
   update(evidence){
     for(const [slot,mesh] of slots){
       const hits=evidence?.slots.get(slot)??[];
       mesh.visible=hits.length>0;
       // Selected shot can be emphasized over cumulative older injuries.
       const active=hits.some(s=>s.id===evidence?.activeShot?.id);
       const mat=mesh.material as THREE.LineBasicMaterial;
       mat.opacity=active?.95:.53;
       mat.color.setHex(active?0xf3c178:0xb86e5c);
     }
   }
 };
}
