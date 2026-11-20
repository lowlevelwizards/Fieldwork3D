/** S7: 9mm sidearm handling for the existing shared resolver.
 * The underlying primary weapon inventory/ID does NOT become 'smg'; the
 * profile object's smg compatibility ID is never emitted as a shot identity.
 * Actual Glock model lives in ShotEvent.secondaryWeapon.
 */
import {WEAPONS,type Weapon} from './breach-combat.ts';
import {type BallisticProfile} from './breach-ballistics.ts';
export const GLOCK_9MM_WEAPON:Weapon=Object.freeze({
 ...WEAPONS.smg,label:'GLOCK 9MM',capacity:17,reserve:0,
 interval:.28,reload:1.2,acquisition:.25,
 optimalRange:85,accuracy:.70,penetration:.085,noise:295
});
export const GLOCK_9MM_BALLISTICS:BallisticProfile=Object.freeze({
 pointSpread:.165,adsSpread:.075,recoilKick:.056,
 recover:.32,turnSpeed:8.9
});
