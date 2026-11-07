/** Equipment 21.01: stable, renderer-independent workbench mount anchors.
 * They use the same receiver-local coordinates as the live gun and shot.
 */
import {WEAPON_ATTACHMENT_SLOTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {FAMILY_PART_SLOTS,type FamilyPartSlot} from './equipment-weapon-families.ts';
export type WorkbenchSocket=WeaponAttachmentSlot|`body-${FamilyPartSlot}`;
export type WorkbenchMode='attachments'|'body';
export type WorkbenchMount={slot:WorkbenchSocket;x:number;y:number;z:number;name:string};
export function workbenchMounts(config:WeaponConfiguration,
 mode:WorkbenchMode='attachments'):WorkbenchMount[]{
 if(mode==='body'&&config.build){
  const body:Record<FamilyPartSlot,WorkbenchMount>={
   stock:{slot:'body-stock',x:-14,y:2,z:4,name:'Stock socket'},
   receiver:{slot:'body-receiver',x:-2,y:4,z:5,name:'Receiver socket'},
   grip:{slot:'body-grip',x:-4,y:-5,z:5,name:'Grip socket'},
   magazine:{slot:'body-magazine',x:3,y:-8,z:5,name:'Magazine socket'},
   handguard:{slot:'body-handguard',x:9,y:3,z:5,name:'Handguard socket'},
   barrel:{slot:'body-barrel',x:17,y:2,z:5,name:'Barrel socket'}
  };
  return FAMILY_PART_SLOTS.map(slot=>body[slot]);
 }
 const a=resolveWeaponAssembly(config);
 const mounts:Record<WeaponAttachmentSlot,WorkbenchMount>={
  opticMount:{slot:'opticMount',x:-2,y:5,z:1,name:'Top rail mount'},
  optic:{slot:'optic',x:a.mounted.optic.mountX,y:9,z:1,name:'Sight rail'},
  muzzle:{slot:'muzzle',x:a.muzzleX,y:4,z:1,name:'Barrel tip'},
  foregrip:{slot:'foregrip',x:a.supportX,y:-7,z:1,name:'Support rail'},
  stock:{slot:'stock',x:a.stockX,y:5,z:1,name:'Buttstock'},
  light:{slot:'light',x:a.mounted.light.mountX,y:-1,z:7,name:'Accessory rail'},
  sling:{slot:'sling',x:-5,y:-5,z:8,name:'Sling anchors'}
 };
 return WEAPON_ATTACHMENT_SLOTS.filter(slot=>!config.build||slot!=='stock')
  .map(slot=>mounts[slot]);
}
