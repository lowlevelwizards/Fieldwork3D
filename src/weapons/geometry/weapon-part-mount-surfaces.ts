/** M1.2: part-owned visual mounting surfaces. This module never decides
 * weapon ownership, ballistics, gameplay sights or attachment inventory.
 * A surface exists only when the installed part advertises the interface.
 * X spans/Y supports are derived from the same authored geometry constants.
 */
import type {WeaponFamilyBuild,PartMountFace,PartMountRole,
 PartMountStandard,FamilyPartSlot} from '../../equipment-weapon-families.ts';
import {FAMILY_PARTS} from '../../equipment-weapon-families.ts';
import {AR_VISUAL_AXIS_Y} from './ar-barrel-profiles.ts';
import {akBarrelArt} from './ak-barrel-profiles.ts';
import {hkBarrelArt} from './hk-barrel-profiles.ts';
import {AR_HANDGUARD_START,arHandguardEnd,akHandguardStart}
 from '../../breach-weapon-contact-zones.ts';
import {HK_CLAW_VISUAL} from './hk-rail-accessories.ts';
import {AK_SIDE_MOUNT_ART} from './ak-side-mount-geometry.ts';
import {g36ReceiverRailSpan} from './g36-variant-parts.ts';
export type WeaponMountSurface=Readonly<{
 id:string;ownerPartId:string;ownerSlot:FamilyPartSlot|'opticMount';
 standard:PartMountStandard;role:PartMountRole;face:PartMountFace;
 startX:number;endX:number;y:number;z:number;
}>;
/** X/y/z reflect current *visible support* geometry, not tactical aim datum.
 * Side-facing rails advertise their actual visual Z depth and remain separate
 * from top/bottom faces. No pose or muzzle socket is modified here.
 */
export function weaponPartMountSurfaces(build:WeaponFamilyBuild,
 opticMount='optic-mount-none'):readonly WeaponMountSurface[]{
 const result:WeaponMountSurface[]=[];
 const add=(ownerSlot:FamilyPartSlot,span:readonly [number,number],
  y:number,z:number)=>{
  const part=FAMILY_PARTS[build.parts[ownerSlot]];
  for(const mount of part?.mounts??[]){
   result.push({id:part.id+':'+mount.role+':'+mount.face,
    ownerPartId:part.id,ownerSlot,
    standard:mount.standard,role:mount.role,face:mount.face,
    startX:span[0],endX:span[1],y,z:mount.face==='side'?z:0});
  }
 };
 if(build.parts.receiver==='ar-flat'){
  // addARRailSegments: -5.3..2.3, three teeth centred -4.5/-1.5/+1.5
  // at Y=2.84, each tooth .34 tall.
  add('receiver',[-5.3,2.3],3.01,0);
 }
 if(build.family==='ak'){
  const owner=FAMILY_PARTS[build.parts.receiver];
  const d=AK_SIDE_MOUNT_ART;
  const side=owner?.mounts?.filter(m=>m.standard==='ak-side-dovetail')??[];
  // A real, receiver-owned left dovetail. A classic AK without this
  // declared physical geometry must not gain an imaginary adapter point.
  for(const mount of side){
   result.push({id:owner.id+':'+mount.role+':left',
    ownerPartId:owner.id,ownerSlot:'receiver',
    standard:mount.standard,role:mount.role,face:'side',
    startX:d.startX,endX:d.endX,y:d.contactY,z:d.contactZ});
  }
  if(opticMount==='optic-ak-side-picatinny'&&
   side.some(m=>m.role==='opticMount')){
   result.push({id:'optic-ak-side-picatinny:top',
    ownerPartId:'optic-ak-side-picatinny',ownerSlot:'opticMount',
    standard:'picatinny',role:'optic',face:'top',
    startX:d.bridgeStartX,endX:d.bridgeEndX,
    y:d.bridgeTopY,z:0});
  }
 }
 if(build.family==='hk'){
  // Receiver lugs can take the claw *adapter*, not optics directly.
  add('receiver',[-5.3,2.4],1.75,0);
  if(opticMount==='optic-hk-claw'&&
   result.some(s=>s.standard==='hk-claw'&&s.role==='opticMount')){
   const p=HK_CLAW_VISUAL;
   result.push({id:'optic-hk-claw:top',ownerPartId:'optic-hk-claw',
    ownerSlot:'opticMount',standard:'picatinny',role:'optic',face:'top',
    startX:p.railCenterX-p.railLength/2,
    endX:p.railCenterX+p.railLength/2,y:p.supportTopY,z:0});
  }
 }
 if(build.parts.handguard==='ak-rail-long'){
  const front=akBarrelArt(build.parts.barrel)?.handguardFrontX;
  if(front===undefined)throw Error('AK handguard rail requires authored barrel');
  const upperRear=akHandguardStart(build.parts.receiver)+1.08;
  // AK builder: one box centered halfway between upperRear+.9 and front
  // with actual width front-upperRear-1.2, top at 2.88+.24.
  const part=FAMILY_PARTS[build.parts.handguard];
  for(const mount of part.mounts??[]){
   result.push({id:part.id+':'+mount.role+':'+mount.face,
    ownerPartId:part.id,ownerSlot:'handguard',
    standard:mount.standard,role:mount.role,face:mount.face,
    startX:upperRear+1.05,endX:front-.15,
    y:mount.face==='top'?3.12:mount.face==='bottom'?-1.5:0,
    z:mount.face==='side'?1.74:0});
  }
 }
 if(build.family==='ar'&&FAMILY_PARTS[build.parts.handguard]?.mounts?.length){
  const start=AR_HANDGUARD_START,end=arHandguardEnd(build.parts.handguard);
  const ris=build.parts.handguard==='ar-risii';
  const bottom=ris?-1.47:-1.65;
  // Handguard builder shifts all rail Y by the AR bore/forearm datum.
  const part=FAMILY_PARTS[build.parts.handguard];
  for(const mount of part.mounts??[]){
   result.push({id:part.id+':'+mount.role+':'+mount.face,
    ownerPartId:part.id,ownerSlot:'handguard',
    standard:mount.standard,role:mount.role,face:mount.face,
    startX:start,endX:end,
    y:mount.face==='bottom'?bottom-.17+AR_VISUAL_AXIS_Y:
      .59+AR_VISUAL_AXIS_Y,
    z:mount.face==='side'?2.39:0});
  }
 }
 if(build.family==='g36'){
  // Expose only the actual Picatinny surface in the variant's geometry.
  // C extends forward; KA4 retains its previously approved rail span.
  if(build.parts.receiver==='g36-rail-receiver')
   add('receiver',g36ReceiverRailSpan(build.parts.barrel),2.225,0);
  if(build.parts.handguard==='g36-handguard-k-rail'){
   const part=FAMILY_PARTS[build.parts.handguard];
   for(const mount of part.mounts??[]){
    result.push({id:part.id+':'+mount.role+':'+mount.face,
     ownerPartId:part.id,ownerSlot:'handguard',
     standard:mount.standard,role:mount.role,face:mount.face,
     startX:mount.face==='bottom'?4.49:5.425,
     endX:mount.face==='bottom'?10.79:10.075,
     y:mount.face==='bottom'?-2.15:-.20,
     z:mount.face==='side'?1.61:0});
   }
  }
 }
 if(build.parts.handguard==='hk-mp5-trirail'){
  const art=hkBarrelArt(build.parts.barrel);
  if(!art)throw Error('MP5 tri-rail requires authored fore-end landmarks');
  const part=FAMILY_PARTS[build.parts.handguard];
  // addMP5TriRail: rails are span-.60 on a real art-derived fore-end;
  // bottom top surface -1.56+.43/2; side outer ±(1.54+.43/2).
  for(const mount of part.mounts??[])
   result.push({id:part.id+':'+mount.role+':'+mount.face,
    ownerPartId:part.id,ownerSlot:'handguard',
    standard:mount.standard,role:mount.role,face:mount.face,
    startX:art.handguardStartX+.30,endX:art.handguardEndX-.30,
    y:mount.face==='bottom'?-1.775:-.29,
    z:mount.face==='side'?1.755:0});
 }
 return result;
}
export function preferredOpticMountSurface(build:WeaponFamilyBuild,
 opticMount='optic-mount-none'):WeaponMountSurface|undefined{
 const surfaces=weaponPartMountSurfaces(build,opticMount);
 // Receiver top or deliberate adapter is the normal long-eye-relief seat.
 // AK's railed fore-end is a forward-mount compromise until per-optic
 // eye-relief/footprint mechanics are added (no silent old save migrations).
 return surfaces.find(s=>s.role==='optic'&&s.ownerSlot==='opticMount')??
  // A receiver side dovetail is for a *direct-fit* proprietary optic,
  // never an uninstalled generic Picatinny reflex sight.
  surfaces.find(s=>s.role==='optic'&&s.ownerSlot==='receiver'&&
   s.face==='top'&&s.standard==='picatinny')??
  surfaces.find(s=>s.role==='optic'&&s.ownerSlot==='handguard');
}
