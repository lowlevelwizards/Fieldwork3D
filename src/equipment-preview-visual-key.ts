/** Read-only render invalidation fingerprint for the equipment inspector.
 * Snapshot values rather than object identities so in-place Studio/kit edits
 * invalidate immediately, while repeated equivalent UI renders do no GPU work.
 */
import type {WeaponId} from './breach-combat.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {MagazineItem} from './breach-magazines.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';

export function equipmentPreviewVisualKey(
 operatorId:string,weapon:WeaponId,appearanceSeed:number,
 equipment:EquipmentLoadout,weaponConfiguration?:WeaponConfiguration,
 magazines:readonly MagazineItem[]=[],wardrobe?:WardrobeOptions
):string{
 return JSON.stringify([operatorId,weapon,appearanceSeed,equipment,
  weaponConfiguration??null,magazines,wardrobe??null]);
}
