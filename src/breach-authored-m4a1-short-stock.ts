/** Operator-authored, approved-by-visual-eye M4A1 short-stock END pose.
 * Captured from Pose Workbench v1; retain coordinates verbatim.
 * This is an exact silhouette target, not an arbitrary maximum retraction.
 * Chest-local: +X forward, +Y up, +Z firing/right side.
 * Poses for other platforms remain unchanged until individually authored.
 */
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WorkbenchPose} from './operator-pose-workbench.ts';

export const M4A1_AUTHORED_SHORT:Readonly<WorkbenchPose>={
 version:1,
 weapon:'carbine',
 preset:'ar-m4a1',
 targets:{
  stock:[-9.2,-3.1,9.5],
  supportShoulder:[4.1,4.8,-5.8],
  firingShoulder:[3.6,3.94,5.3],
  supportHand:[9.65443922690596,-8.220156243484727,4.960267438360026],
  firingHand:[-1.5429852109064708,-8.962764956152528,9.93532957459017],
  supportElbow:[9.5,-3.1,-0.6],
  firingElbow:[-3.8,-4.050550665342721,12.08454391675615],
 },
 torso:[0,0.8021409131831525,-0.7091446901966934],
 weaponRotation:[3,8,-13]
};
/** Only the exact M4A1 furniture this user posed. A different AR, AK, or
 * even a short Mk18 must never inherit an unreviewed set of wrists/elbows.
 * Keep handling changes strictly scoped to this platform. */
export function isAuthoredM4A1(weapon:WeaponId,
 configuration?:WeaponConfiguration):boolean{
 const parts=configuration?.build?.parts;
 return weapon==='carbine'&&configuration?.weapon==='carbine'&&
  parts?.receiver==='ar-flat'&&parts?.stock==='ar-stock-m4'&&
  parts?.handguard==='ar-quad'&&parts?.barrel==='ar-145-gov';
}
export function authoredShortPhase(raw:number|undefined):number{
 const q=Math.max(0,Math.min(1,raw??1));
 return q*q*(3-2*q);
}
