/** M3.0C4: extremely narrow production release of the C3 WebGL-proofed
 * modular geometry compiler. Builds are compared by their COMPLETE installed
 * 6-slot identity, not receiver family or a user-facing weapon label.
 *
 * Opt-in is performed by the shared silhouette constructor at build/swap
 * time only. Reload magazines, mutable attachments and non-factory custom
 * assemblies remain individual meshes. No mutable global enable switch.
 */
import * as THREE from 'three';
import {matchingFamilyPreset,type WeaponFamilyBuild}
 from '../../equipment-weapon-families.ts';
import {compileRigidWeaponPartPilot}
 from './rigid-weapon-part-pilot.ts';

/** Both cohorts passed independent GPU framebuffer parity and exact
 * factory identity / reload / Workbench tests. Do not include custom builds.
 */
export const VERIFIED_RIGID_FACTORY_IDS=Object.freeze([
 // M3.0C4: first release, preserve existing production behavior.
 'ak-akms','ak-aks74u','ar-m4a1',
 // M3.0C5: 12 browser views, 35 additional measured draw calls removed.
 'ak-ak74','ak-aks74','ak-rpk74','ar-m16a4'
] as const);
const allowed=new Set<string>(VERIFIED_RIGID_FACTORY_IDS);
const staticSlots=['receiver','barrel','handguard','stock','grip'] as const;
export type ValidatedRigidCompilation=Readonly<{
 factoryId:string;sourceMeshes:number;compiledMeshes:number;
 avoidedSubmissions:number
}>;
/** Returns null for all non-validated builds or if compilation is unsafe.
 * Restore is possible until all five slots have compiled successfully.
 * After commit, the final merged meshes are owned by the existing per-build
 * clearWeaponSilhouette lifecycle; shared palette materials are not disposed.
 */
export function compileValidatedFactoryRigidBody(root:THREE.Group,
 build:WeaponFamilyBuild):ValidatedRigidCompilation|null{
 const preset=matchingFamilyPreset(build);
 if(!preset||!allowed.has(preset.id))return null;
 const changes:ReturnType<typeof compileRigidWeaponPartPilot>[]=[];
 try{
  for(const slot of staticSlots)
   changes.push(compileRigidWeaponPartPilot(root,slot,build.parts[slot]));
  const avoidedSubmissions=changes.reduce(
   (n,result)=>n+result.avoidedSubmissions,0);
  // Safety gate: a materially different profile must not be accepted solely
  // because the ID string still matches the old authored factory model.
  if(avoidedSubmissions<5){
   for(const result of changes.reverse())result.restore();
   return null;
  }
  const sourceMeshes=changes.reduce((n,x)=>n+x.sourceMeshes,0);
  const compiledMeshes=changes.reduce((n,x)=>n+x.compiledMeshes,0);
  changes.forEach(x=>x.commit());
  return Object.freeze({factoryId:preset.id,sourceMeshes,
   compiledMeshes,avoidedSubmissions});
 }catch{
  // Optional art optimization must never make a playable gun disappear.
  for(const result of changes.reverse())result.restore();
  return null;
 }
}
