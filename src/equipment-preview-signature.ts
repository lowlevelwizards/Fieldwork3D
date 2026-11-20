/** P3.C: a value-based key for expensive loadout preview presentation.
 * Roster adapters may clone validated JSON snapshots during normal UI paints.
 * Identity and every input to the actual rig pose must participate, including
 * carry and wardrobe values, so no edited visual can reuse an obsolete rig.
 * A nonserializable input never qualifies for the no-op fast path.
 */
import type {WeaponId} from './breach-combat.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {MagazineItem} from './breach-magazines.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';

export function equipmentPreviewSignature(
 operatorId:string,weapon:WeaponId,appearanceSeed:number,
 equipment:EquipmentLoadout,weaponConfiguration:WeaponConfiguration|undefined,
 magazines:readonly MagazineItem[],wardrobe:WardrobeOptions|undefined,
 heldWeapon:boolean
):string|null{
 try{
  return JSON.stringify([operatorId,weapon,appearanceSeed,equipment,
   weaponConfiguration,magazines,wardrobe,heldWeapon]);
 }catch{
  return null;
 }
}
