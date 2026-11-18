/** M2.0 audit ONLY: evidence for existing M1 mount declarations.
 * This must not grant compatibility, relocate equipment or create geometry.
 * M2.1+ will resolve discrete slots and handed side faces from authored art.
 */
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {weaponAttachmentAllowed} from '../../equipment-weapon-assemblies.ts';
import {weaponPartMountSurfaces,type WeaponMountSurface}
 from './weapon-part-mount-surfaces.ts';

export type MountContactEvidence='authored'|'declared-only'|'covered'|'unreviewed';
export type MountNormal='positive-y'|'negative-y'|'side-unresolved';
export type MountInventoryEntry=Readonly<{
 surface:WeaponMountSurface;
 /** "authored" means a matching visible rail/bridge, NOT a fitted clamp. */
 contact:MountContactEvidence;
 normal:MountNormal;
 /** A code/documentation anchor, not an alternate physical placement. */
 evidenceSource:string;
}>;
export type MountInventoryFindingCode=
 'unbuilt-interface'|'covered-interface'|'unknown-geometry'|
 'ambiguous-side'|'unmounted-light-allowed'|'forward-magnified-unchecked';
export type MountInventoryFinding=Readonly<{
 code:MountInventoryFindingCode;
 ownerPartId:string;
 surfaceId?:string;
}>;
export type WeaponMountInventory=Readonly<{
 surfaces:readonly MountInventoryEntry[];
 findings:readonly MountInventoryFinding[];
}>;

/** These exceptions are findings, not a second authoritative compatibility list.
 * Never use this evidence audit to enable a new mount: the installed part and
 * geometry source must be updated together in the later M2 work packages.
 */
function contactEvidence(s:WeaponMountSurface):
 Pick<MountInventoryEntry,'contact'|'evidenceSource'>{
 if(s.standard==='ak-side-dovetail'||
    s.ownerPartId==='optic-ak-side-picatinny'){
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/ak-side-mount-geometry.ts'};
 }
 if(s.ownerPartId==='ak-rail-long'){
  // AK builder only adds the TOP block: no lower or lateral rails exist.
  return {contact:s.face==='top'?'authored':'declared-only',
   evidenceSource:'src/weapons/geometry/ak-silhouettes.ts'};
 }
 if(s.ownerPartId==='ar-compact-rail'&&s.face==='side'){
  // Sides have solid covers and omit exposed teeth.
  return {contact:'covered',
   evidenceSource:'src/weapons/geometry/ar-silhouettes.ts'};
 }
 if(s.ownerPartId==='g36-rail-receiver'||
    s.ownerPartId==='g36-handguard-k-rail')
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/g36-variant-parts.ts'};
 if(s.ownerPartId==='ar-flat')
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/ar-silhouettes.ts'};
 if(['ar-quad','ar-m5-rail','ar-risii','ar-compact-rail'].includes(s.ownerPartId))
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/ar-rail-profiles.ts'};
 if(s.ownerPartId==='hk-mp5-trirail')
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/hk-mp5-handguard-profiles.ts'};
 if(s.ownerPartId==='optic-hk-claw')
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/hk-rail-accessories.ts'};
 if(s.ownerSlot==='receiver'&&s.standard==='hk-claw')
  return {contact:'authored',
   evidenceSource:'src/weapons/geometry/hk-rail-accessories.ts'};
 return {contact:'unreviewed',
  evidenceSource:'src/weapons/geometry/weapon-part-mount-surfaces.ts'};
}

/** Read-only census across the exact current build. +X points toward muzzle;
 * +Y is up; +/-Z are opposing sides. The M1 "side" declaration has only
 * one positive-Z point, not a verified left/right mounting pair.
 */
export function auditWeaponMountInventory(config:WeaponConfiguration):WeaponMountInventory{
 if(!config.build)return {surfaces:[],findings:[]};
 const surfaces=weaponPartMountSurfaces(
  config.build,config.slots.opticMount).map(surface=>{
  const evidence=contactEvidence(surface);
  const normal:MountNormal=surface.face==='top'?'positive-y':
   surface.face==='bottom'?'negative-y':'side-unresolved';
  return {surface,...evidence,normal};
 });
 const findings:MountInventoryFinding[]=[];
 for(const entry of surfaces){
  const {surface,contact}=entry;
  if(contact==='declared-only')
   findings.push({code:'unbuilt-interface',ownerPartId:surface.ownerPartId,
    surfaceId:surface.id});
  if(contact==='covered')
   findings.push({code:'covered-interface',ownerPartId:surface.ownerPartId,
    surfaceId:surface.id});
  if(contact==='unreviewed')
   findings.push({code:'unknown-geometry',ownerPartId:surface.ownerPartId,
    surfaceId:surface.id});
  // M2.3's left-only AK receiver dovetail is unambiguous; M1 generic
  // handguard side declarations still need physical handedness resolution.
  if(surface.face==='side'&&surface.standard!=='ak-side-dovetail')
   findings.push({code:'ambiguous-side',ownerPartId:surface.ownerPartId,
    surfaceId:surface.id});
 }
 // M1 gates optics/foregrips through part interfaces, but its light case
 // still permits the legacy light on platforms with no real side rail.
 const validLight=surfaces.some(x=>x.surface.role==='light'&&
  x.contact==='authored');
 if(weaponAttachmentAllowed(config,'light','light-compact')&&!validLight)
  findings.push({code:'unmounted-light-allowed',
   ownerPartId:config.build.parts.handguard});
 // The generic magnified optic is currently accepted on an AK forward rail.
 // M2.4 owns the eye-relief rule; M2.0 must document it without resetting saves.
 if(config.build.parts.handguard==='ak-rail-long'&&
  weaponAttachmentAllowed(config,'optic','optic-magnified')&&
  !surfaces.some(x=>x.surface.role==='optic'&&
   x.surface.standard==='picatinny'&&x.surface.face==='top'&&
   (x.surface.ownerSlot==='receiver'||x.surface.ownerSlot==='opticMount')))
  findings.push({code:'forward-magnified-unchecked',
   ownerPartId:config.build.parts.handguard});
 return {surfaces,findings};
}
