/** Abstract Fieldwork damage pacing, not real glass physics.
 * Standard attacks consume one of three integrity pips. The existing heavy
 * weapon categories consume the entire pane budget. Explicit break actions
 * are independent; future blast gameplay can use the same full-break path. */
import type {WeaponId} from './breach-combat.ts';
export const GLASS_INTEGRITY=3;
export function glassImpactDamage(weapon:WeaponId,secondary=false):number{
 return !secondary&&(weapon==='rifle'||weapon==='shotgun')?GLASS_INTEGRITY:1;
}
