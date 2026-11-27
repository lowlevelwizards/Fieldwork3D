import {quoteUnifiedCarryTransaction} from './equipment-unified-loadout.ts';
import {reconcileUnifiedFieldLimit,type UnifiedDeployedCarry} from './equipment-unified-deployed.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
/** L2.12F1 — a deployment is a detached view of the saved operator kit.
 * Roster/Campaign remain the sole owners of pre-mission equipment, ammo and
 * medical stock. This snapshot is projected once onto the existing TeamActor
 * fields; it is NOT a second inventory ledger or a serialized save format.
 */
import type {WeaponId} from './breach-combat.ts';
import type {TeamActor} from './breach-game.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {fitMagazineInventory} from './arsenal/live-magazine-capacity.ts';
import {readLoadedMagazineId} from './equipment-magazine-persistence.ts';
import {stageMagazines,type LocatedMagazine} from './equipment-magazine-placement.ts';
import {readEquipmentLoadout,equippedFlashCharges,equippedRestraintCharges,
 loadMovementScale,type EquipmentLoadout} from './equipment-loadouts.ts';
import {kitMedicalSupplies,normalizedMedicalSupplies,
 type FieldMedicalSupplies} from './equipment-medical-supplies.ts';
import {issuedWedges} from './equipment-entry-tools.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {resolveCatalogConfiguration,starterWeaponPreset} from './breach-weapon-issue.ts';

export type DeploymentInventorySource={
 id:string;weapon:WeaponId;loadout:EquipmentLoadout;
 weaponConfiguration:WeaponConfiguration;
 magazine:number;reserve:number;magazines:readonly MagazineItem[];
 loadedMagazineId:string;
 /** Explicit staging switch; production callers remain V1 until the full migration. */
 carryMode?:'unified';wardrobe?:WardrobeOptions;
 /** Campaign can have depleted medical stock; Quick Play issues kit defaults. */
 medicalSupplies?:FieldMedicalSupplies;
};
export type DeploymentInventorySnapshot={
 weapon:WeaponId;equipment:EquipmentLoadout;
 weaponConfiguration:WeaponConfiguration;
 magazine:number;reserve:number;insertedMagazineId:string;
 spareMagazines:LocatedMagazine[];
 medicalSupplies:FieldMedicalSupplies;
 flashCharges:number;wedgeRemaining:number;restraintRemaining:number;
 weaponLightOn:boolean;loadMovementScale:number;
 unifiedCarry?:UnifiedDeployedCarry;
};
/** The existing fit/placement functions own all magazine conservation and
 * physical placement. Valid author-chosen IDs, rounds and locations survive;
 * invalid legacy magazine data is repaired from the same owned reserve.
 * Every nested mutable record is detached before a live mission can spend it.
 */
export function captureDeploymentInventory(
 source:DeploymentInventorySource):DeploymentInventorySnapshot{
 let equipment=readEquipmentLoadout(source.loadout,source.weapon,source.id,source.carryMode);
 const config=structuredClone(resolveCatalogConfiguration(source.weaponConfiguration,source.weapon,starterWeaponPreset(source.id)));
 const fitted=fitMagazineInventory(source.id,source.weapon,config,
  source.magazine,source.reserve,source.magazines);
 let spareMagazines=source.weapon==='shotgun'?[]:
  stageMagazines(fitted.magazines,equipment);
 let unifiedCarry:UnifiedDeployedCarry|undefined;
 if(source.carryMode==='unified'){
  const fit=quoteUnifiedCarryTransaction({kit:equipment,wardrobe:source.wardrobe,magazines:fitted.magazines,
   primaryPart:config.build?.parts.magazine,shellReserve:source.weapon==='shotgun'?fitted.reserve:undefined});
  if(!fit.ok)throw Error('UNIFIED CARRY DOES NOT FIT: '+fit.reason);
  equipment=fit.kit;
  spareMagazines=fit.magazines.map(m=>{
   if(!m.location||m.location==='overflow')throw Error('UNIFIED CARRY MISSING MAGAZINE '+m.id);
   return {...m,location:m.location};
  });
  unifiedCarry={input:fit.input,manifest:fit.manifest};
 }
 const permitted=kitMedicalSupplies(equipment);
 const medicalSupplies=source.medicalSupplies?
  normalizedMedicalSupplies(source.medicalSupplies,permitted):permitted;
 return {
  weapon:source.weapon,equipment,weaponConfiguration:config,
  magazine:fitted.magazine,reserve:fitted.reserve,
  insertedMagazineId:readLoadedMagazineId(source.id,source.weapon,
   source.loadedMagazineId,spareMagazines),
  spareMagazines,medicalSupplies,...(unifiedCarry?{unifiedCarry}:{}),
  flashCharges:equippedFlashCharges(equipment),
  wedgeRemaining:issuedWedges(equipment),
  restraintRemaining:equippedRestraintCharges(equipment),
  weaponLightOn:config.slots.light==='light-compact',
  loadMovementScale:loadMovementScale(equipment,config)
 };
}
/** Apply the immutable-in-intent handoff to the simulator's existing, single
 * live combat inventory. No additional per-frame authority is introduced. */
export function applyDeploymentInventory(
 actor:TeamActor,source:DeploymentInventorySource):DeploymentInventorySnapshot{
 const snapshot=captureDeploymentInventory(source);
 applyCapturedDeploymentInventory(actor,snapshot);
 return snapshot;
}
/** Squad preflight computes every snapshot before mutating any actor. */
export function applyCapturedDeploymentInventory(actor:TeamActor,snapshot:DeploymentInventorySnapshot):void{
 actor.weapon=snapshot.weapon;
 actor.equipment=snapshot.equipment;
 actor.unifiedCarry=snapshot.unifiedCarry;
 actor.weaponConfiguration=snapshot.weaponConfiguration;
 actor.magazine=snapshot.magazine;
 actor.reserve=snapshot.reserve;
 actor.insertedMagazineId=snapshot.insertedMagazineId;
 actor.spareMagazines=snapshot.spareMagazines;
 actor.medicalSupplies=snapshot.medicalSupplies;
 actor.flashCharges=snapshot.flashCharges;
 actor.wedgeRemaining=snapshot.wedgeRemaining;
 actor.restraintRemaining=snapshot.restraintRemaining;
 actor.weaponLightOn=snapshot.weaponLightOn;
 actor.nvgDeployed=false;
 actor.loadMovementScale=snapshot.loadMovementScale;
 actor.reload=0;actor.reloadMode=null;
}
/** The existing Campaign flash allocator may issue fewer charges than the
 * saved requested kit. Reflect that actual issue in the detached mission
 * visual/physical manifest too, without modifying Campaign stock or the kit.
 * Later F2 owns GO-time consumption and access semantics.
 */
export function limitDeployedFlashIssue(actor:TeamActor,issued:number):void{
 const actual=Math.max(0,Math.min(actor.flashCharges,
  Number.isFinite(issued)?Math.floor(issued):0));
 actor.flashCharges=actual;
 if(!actor.equipment?.fieldInventory)return;
 let remaining=actual;
 const stacks=actor.equipment.fieldInventory.stacks.flatMap(row=>{
  if(row.itemId!=='flashbang')return [{...row}];
  const quantity=Math.min(remaining,row.quantity);
  remaining-=quantity;
  return quantity>0?[{...row,quantity}]:[];
 });
 actor.equipment={...actor.equipment,
  fieldInventory:{version:1,stacks}};
 if(actor.unifiedCarry)actor.unifiedCarry=reconcileUnifiedFieldLimit(actor.unifiedCarry,'flashbang',actor.equipment.fieldInventory!);
}
