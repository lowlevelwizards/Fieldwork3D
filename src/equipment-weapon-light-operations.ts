/** L1.4 — one fitted-light contract for input, display and illumination.
 * This is equipment validation only: no extra sight/AI or independent light.
 */
import {weaponAttachmentAllowed,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {mountedAccessorySeat} from './weapons/geometry/mounted-accessory-layout.ts';
export type WeaponLightOwner={
 health:number;weaponLightOn:boolean;weaponConfiguration?:WeaponConfiguration;
};
/** A serialized stale or artificially assigned light must not bypass
 * platform/family mount restrictions. Cosmetic helmet lights do not count.
 */
export function fittedWeaponLight(actor:Pick<WeaponLightOwner,'weaponConfiguration'>|undefined):boolean{
 const config=actor?.weaponConfiguration;
 return !!config&&config.slots.light==='light-compact'&&
  weaponAttachmentAllowed(config,'light','light-compact')&&
  // Preserve a stale owned item without letting it emit on a phantom rail.
  (!config.build||!!mountedAccessorySeat(config,'light'));
}
export function weaponLightEmitting(actor:WeaponLightOwner|undefined):boolean{
 return !!actor&&actor.health>0&&actor.weaponLightOn&&fittedWeaponLight(actor);
}
export function weaponLightEditable(actor:WeaponLightOwner|undefined,
 phase:string,replaying=false):boolean{
 return !!actor&&actor.health>0&&!replaying&&
  (phase==='planning'||phase==='running')&&fittedWeaponLight(actor);
}
