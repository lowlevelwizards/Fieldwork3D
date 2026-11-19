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

export type DeploymentInventorySource={
 id:string;weapon:WeaponId;loadout:EquipmentLoadout;
 weaponConfiguration:WeaponConfiguration;
 magazine:number;reserve:number;magazines:readonly MagazineItem[];
 loadedMagazineId:string;
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
};
/** The existing fit/placement functions own all magazine conservation and
 * physical placement. Valid author-chosen IDs, rounds and locations survive;
 * invalid legacy magazine data is repaired from the same owned reserve.
 * Every nested mutable record is detached before a live mission can spend it.
 */
export function captureDeploymentInventory(
 source:DeploymentInventorySource):DeploymentInventorySnapshot{
 const equipment=readEquipmentLoadout(source.loadout,source.weapon);
 const config=structuredClone(source.weaponConfiguration);
 const fitted=fitMagazineInventory(source.id,source.weapon,config,
  source.magazine,source.reserve,source.magazines);
 const spareMagazines=source.weapon==='shotgun'?[]:
  stageMagazines(fitted.magazines,equipment);
 const permitted=kitMedicalSupplies(equipment);
 const medicalSupplies=source.medicalSupplies?
  normalizedMedicalSupplies(source.medicalSupplies,permitted):permitted;
 return {
  weapon:source.weapon,equipment,weaponConfiguration:config,
  magazine:fitted.magazine,reserve:fitted.reserve,
  insertedMagazineId:readLoadedMagazineId(source.id,source.weapon,
   source.loadedMagazineId,spareMagazines),
  spareMagazines,medicalSupplies,
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
 actor.weapon=snapshot.weapon;
 actor.equipment=snapshot.equipment;
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
 return snapshot;
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
}
