/** Concrete AR/AK/HK presentation issue. Internal WeaponId remains the firing/ammo
 * compatibility layer until the separate weapon-stat migration. Never
 * manufacture a variant by changing the simulation class alone. */
import {familyPreset,defaultCatalogReference,initialWeaponFamilyBuild,validFamilyBuild,type WeaponFamilyBuild,type WeaponFamilyPreset} from './equipment-weapon-families.ts';
import {initialWeaponConfiguration,readWeaponConfiguration,selectWeaponFamilyPreset,
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
 if(!preset)throw new Error('Unknown catalog reference: '+presetId);
 const weaponConfiguration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(preset.weapon),presetId);
 if(!weaponConfiguration.build)throw new Error('Unable to issue '+presetId);
 return {preset,weapon:preset.weapon,weaponConfiguration};
}
export function starterWeaponPreset(id:string):string{
 return STARTER_WEAPON_PRESETS[id as keyof typeof STARTER_WEAPON_PRESETS]??'ar-m4a1';
}
/** Catalog configuration authority at preparation/save boundaries.
 * Compatibility categories are input only; never persist a missing build
 * after this boundary. Preserve valid custom and authored configurations. */
export type CatalogWeaponConfiguration=WeaponConfiguration & {build:WeaponFamilyBuild};
export function resolveCatalogConfiguration(config:WeaponConfiguration|undefined,
 weapon:WeaponId,preferred?:string):CatalogWeaponConfiguration{
 if(config?.weapon===weapon&&config.build&&validFamilyBuild(config.build,weapon))
  return config as CatalogWeaponConfiguration;
 const base=readWeaponConfiguration(config,weapon);
 const reference=defaultCatalogReference(weapon,preferred);
 const normalized=base.build?base:readWeaponConfiguration({...base,
  build:initialWeaponFamilyBuild(reference.id)},weapon);
 if(!normalized.build)throw Error('Cannot materialize catalog configuration: '+reference.id);
 return normalized as CatalogWeaponConfiguration;
}
