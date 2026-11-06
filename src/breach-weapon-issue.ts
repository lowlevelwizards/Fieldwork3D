/** Concrete AR/AK presentation issue. Legacy WeaponId remains the firing/ammo
 * compatibility layer until the separate weapon-stat migration. Never
 * manufacture a variant by changing the simulation class alone. */
import {familyPreset,type WeaponFamilyPreset} from './equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WeaponId} from './breach-combat.ts';

export type IssuedWeapon={
 preset:WeaponFamilyPreset;weapon:WeaponId;weaponConfiguration:WeaponConfiguration;
};
export const STARTER_WEAPON_PRESETS={
 rook:'ar-m4a1',moss:'ak-ak105',ash:'ar-m16a4',vale:'ak-ak74m'
} as const;
export function issueWeaponPreset(presetId:string):IssuedWeapon{
 const preset=familyPreset(presetId);
 if(!preset)throw new Error('Unknown issued AR/AK preset: '+presetId);
 const weaponConfiguration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(preset.weapon),presetId);
 if(!weaponConfiguration.build)throw new Error('Unable to issue '+presetId);
 return {preset,weapon:preset.weapon,weaponConfiguration};
}
export function starterWeaponPreset(id:string):string{
 return STARTER_WEAPON_PRESETS[id as keyof typeof STARTER_WEAPON_PRESETS]??'ar-m4a1';
}
/** Never erase an intentional saved family build or its accessories. Only
 * missing class-only configurations receive a present-day authored model. */
export function resolveIssuedOrLegacy(config:WeaponConfiguration|undefined,
 weapon:WeaponId,presetId:string):WeaponConfiguration{
 if(config?.build||weapon==='smg'||weapon==='shotgun')
  return config??initialWeaponConfiguration(weapon);
 const preferred=issueWeaponPreset(presetId);
 // A saved generic rifle/carbine can differ from this operator's new default.
 // Select a genuine same-class silhouette rather than leave a placeholder.
 const issue=preferred.weapon===weapon?preferred:
  issueWeaponPreset(weapon==='rifle'?'ar-m16a2':'ar-m4a1');
 return {...issue.weaponConfiguration,slots:{...issue.weaponConfiguration.slots,
  ...(config?.slots??{})}};
}
