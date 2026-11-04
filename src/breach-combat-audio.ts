/** Deterministic parameters for the existing WebAudio cue budget.
 * Existing room/door acoustics compute attenuation. This only shapes what
 * an already audible shot sounds like, never grants unseen hit knowledge.
 */
import type {WeaponId} from './breach-combat.ts';
export type WeaponAudioCue={
 crackHz:number;crackSeconds:number;bodyHz:number;
 bodySeconds:number;bodyLevel:number;
};
export function weaponAudioCue(weapon:WeaponId,
 suppressed=false):WeaponAudioCue{
 const base:Record<WeaponId,WeaponAudioCue>={
  smg:{crackHz:185,crackSeconds:.075,bodyHz:102,bodySeconds:.115,bodyLevel:.30},
  carbine:{crackHz:137,crackSeconds:.095,bodyHz:74,bodySeconds:.14,bodyLevel:.38},
  rifle:{crackHz:113,crackSeconds:.11,bodyHz:59,bodySeconds:.19,bodyLevel:.46},
  shotgun:{crackHz:85,crackSeconds:.16,bodyHz:48,bodySeconds:.26,bodyLevel:.54}
 };
 const cue=base[weapon];
 if(!suppressed)return cue;
 return {...cue,crackHz:cue.crackHz*.83,crackSeconds:cue.crackSeconds*.68,
  bodySeconds:cue.bodySeconds*.70,bodyLevel:cue.bodyLevel*.55};
}
export function audibleImpact(visible:boolean,intensity:number):boolean{
 return visible||intensity>=.2;
}
