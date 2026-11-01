/** Equipment 21.01: stable, renderer-independent workbench mount anchors.
 * They use the same receiver-local coordinates as the live gun and shot.
 */
import {WEAPON_ATTACHMENT_SLOTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
export type WorkbenchMount={slot:WeaponAttachmentSlot;x:number;y:number;z:number;name:string};
export function workbenchMounts(config:WeaponConfiguration):WorkbenchMount[]{
 const a=resolveWeaponAssembly(config);
 const mounts:Record<WeaponAttachmentSlot,WorkbenchMount>={
  optic:{slot:'optic',x:a.mounted.optic.mountX,y:9,z:1,name:'Sight rail'},
  muzzle:{slot:'muzzle',x:a.muzzleX,y:4,z:1,name:'Barrel tip'},
  foregrip:{slot:'foregrip',x:a.supportX,y:-7,z:1,name:'Support rail'},
  stock:{slot:'stock',x:a.stockX,y:5,z:1,name:'Buttstock'},
  light:{slot:'light',x:a.mounted.light.mountX,y:-1,z:7,name:'Accessory rail'},
  sling:{slot:'sling',x:-5,y:-5,z:8,name:'Sling anchors'}
 };
 return WEAPON_ATTACHMENT_SLOTS.map(slot=>mounts[slot]);
}
