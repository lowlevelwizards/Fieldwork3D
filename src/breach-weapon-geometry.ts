/** Distinct low-poly firearm silhouettes in the shared shoulder-relative axes.
 * Geometry is constructed only at rig creation or a planning-phase weapon swap.
 * All barrels terminate at model-local X = 19.5, the baseline shot muzzle.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import {type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {readWeaponFamilyBuild,initialWeaponFamilyBuild,defaultCatalogReference} from './equipment-weapon-families.ts';
import {buildModularWeaponSilhouette} from './breach-modular-weapon-geometry.ts';
import {measureWeaponRetentionSockets} from './weapons/geometry/weapon-retention-visual-sockets.ts';
import {poseConfiguredStock} from './weapon-stock-geometry.ts';
import {measureVisibleStockContact}
 from './breach-stock-contact-surface.ts';
import {addHKClawRail} from './weapons/geometry/hk-rail-accessories.ts';
import {addAKSidePicatinnyAdapter} from './weapons/geometry/ak-side-mount-geometry.ts';
import {compileValidatedFactoryRigidBody}
 from './weapons/geometry/validated-factory-rigid-compile.ts';
/** Set rigidCompilation:'disabled' for independent baseline/diagnostic builds.
 * Defaults to C3-verified exact-factory builds only; never custom part sets.
 */
export type WeaponGeometryOptions=Readonly<{
 rigidCompilation?:'validated-factory'|'disabled'
}>;
export function buildWeaponSilhouette(id:WeaponId,
 steel:THREE.Material,dark:THREE.Material,
 config?:WeaponConfiguration,
 options:WeaponGeometryOptions={}):THREE.Group{
 // No class-only placeholder silhouette may appear in live play or replay.
 // Keep the category as a ballistics tier, never an obsolete 3D model.
 const fallback=defaultCatalogReference(id).id;
 const familyBuild=(config?.weapon===id?
  readWeaponFamilyBuild(config.build,id):undefined) ??
  initialWeaponFamilyBuild(fallback);
 if(familyBuild){
  const root=buildModularWeaponSilhouette(familyBuild,steel,dark,
   !config||config.slots.muzzle==='muzzle-bare');
  if(familyBuild.family==='hk'&&config?.slots.opticMount==='optic-hk-claw')
   addHKClawRail(root);
  if(familyBuild.family==='ak'&&
   config?.slots.opticMount==='optic-ak-side-picatinny')
   addAKSidePicatinnyAdapter(root);
  // Use exactly the saved physical state in live, replay and Workbench.
  if(config?.weapon===id)poseConfiguredStock(root,config);
  // Preserve the original authored stock measurement, even if static
  // submeshes are subsequently baked into larger vertex buffers.
  const stockContact=config?measureVisibleStockContact(root,config):null;
  // Preserve candidate seats before rigid compilation loses part names.
  root.userData.retentionSockets=measureWeaponRetentionSockets(root);
  if(config?.weapon===id&&config.build&&
   options.rigidCompilation!=='disabled'&&!config.stockPosition){
   const report=compileValidatedFactoryRigidBody(root,familyBuild);
   if(report)root.userData.rigidCompilation=report;
  }
  root.userData.visibleStockContact=stockContact;
  return root;
 }
 throw Error('Missing authored weapon reference: '+fallback);
}
/** Release per-build geometry AND instance buffers when a weapon changes.
 * Materials are shared registry assets, never owned by the silhouette.
 * Instanced rails also allocate GPU instance attributes, which a geometry
 * dispose alone does not release when the preview is rebuilt repeatedly.
 */
export function clearWeaponSilhouette(g:THREE.Group){
 g.traverse(o=>{
  if(o instanceof THREE.InstancedMesh)o.dispose();
  if(o instanceof THREE.Mesh)o.geometry.dispose();
 });
 g.clear();
 g.userData.visibleStockContact=null;
 g.userData.rigidCompilation=null;
 g.userData.retentionSockets=null;
}
