/** User-authored high and low M4A1 carry poses, captured from the Workbench.
 * These are the authoritative reference coordinates, NOT interpolated guesses.
 * Transfer to other firearms happens once per stable weapon configuration.
 * +X forward; +Y up; +Z firing side. Euler angles are degrees (XYZ).
 */
import type {WorkbenchPose} from './operator-pose-workbench.ts';
export type ReadyCarry='high'|'low';
export const AUTHORED_READY_CARRIES:Readonly<Record<ReadyCarry,Readonly<WorkbenchPose>>> = {
 high:{
  version:1,weapon:'carbine',preset:'ar-m4a1',
  targets:{
   stock:[3.9,-2.3,6.6],
   supportShoulder:[1.2200000000000006,3.94,-6.9],
   firingShoulder:[1.12,3.94,6.900000000000002],
   supportHand:[14.7,9.8,2.8725966357508064],
   firingHand:[12.7161157051268,1.582301553410546,5.9713198172340185],
   supportElbow:[10.5,4.6,-.1],
   firingElbow:[4.164930941715731,-4.050550665342721,12.08454391675615]
  },
  torso:[0,.8021409131831524,-.7091446901966934],
  weaponRotation:[10,20,48]
 },
 low:{
  version:1,weapon:'carbine',preset:'ar-m4a1',
  targets:{
   stock:[3.4499999999999993,4.45,4.8],
   supportShoulder:[1.2200000000000006,3.94,-6.9],
   firingShoulder:[1.12,3.94,6.900000000000002],
   supportHand:[14.5,-5.097183232281694,-3.6],
   firingHand:[9.549117764612701,-2.9149488620093384,
    3.4772411393707765],
   supportElbow:[10.462739837509194,-8.3,-10],
   firingElbow:[4.164930941715731,-4.050550665342721,12.08454391675615]
  },
  torso:[0,.8021409131831524,-.7091446901966934],
  weaponRotation:[0,29,-26]
 }
};
