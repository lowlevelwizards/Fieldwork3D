/** Single Studio policy for the large preview and item-card cameras.
 * This is only presentation: real equipment, saves and combat do not change.
 */
import type {WardrobeSlot} from './operator-wardrobe-data.ts';
const FABRIC_INSPECTION_SLOTS:ReadonlySet<WardrobeSlot>=new Set([
 'top','trousers','facewear'
]);
export function studioUsesClothesOnly(slot:WardrobeSlot):boolean{
 return FABRIC_INSPECTION_SLOTS.has(slot);
}
export const studioUsesVisibleFace=(slot:WardrobeSlot)=>slot==='facewear';
