/** Prevent fixed-tick stand/crouch chatter without delaying a legally
 * required muzzle-lane correction. Enemy-only: player posture is authored.
 */
export type EnemyPosture='stand'|'crouch';
export function settledEnemyPosture(current:EnemyPosture,
 desired:EnemyPosture,now:number,lastChangedAt:number,
 requireMuzzleClearance=false):EnemyPosture{
 if(current===desired)return current;
 if(requireMuzzleClearance&&desired==='stand')return 'stand';
 return now-lastChangedAt>=.38?desired:current;
}
