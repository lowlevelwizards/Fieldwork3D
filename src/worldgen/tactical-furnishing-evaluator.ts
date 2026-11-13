/** C3: a fixed baseline for ranking an optional functional room fixture.
 * No geometry is authored here. Actual physical placement/clearance remains
 * in room-furnishing; both reports use the same 2.5D ballistic/sight solvers.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {assessRoomBallisticCover} from './room-cover-audit.ts';
import {assessRoomSightlines} from './room-sightline-audit.ts';
export function createTacticalFurnishingEvaluator(site:Site,room:Room){
 const beforeBallistic=assessRoomBallisticCover(site,room);
 const beforeSight=assessRoomSightlines(site,room);
 const sightActive=room.w>=110&&room.h>=110&&
   beforeSight.thresholds>0&&beforeSight.exposedSamples>=2;
 return (candidate:Obstacle):number=>{
  // Tall optional pieces cannot take away the room's last good entry line.
  const afterSight=assessRoomSightlines(site,room,[candidate]);
  if(sightActive&&afterSight.exposedSamples<2)return -Infinity;
  if(beforeSight.thresholds&&beforeSight.samples>=3&&
     (afterSight.samples<Math.max(3,beforeSight.samples-2)||
      beforeSight.exposedSamples>=2&&afterSight.exposedSamples<2))
    return -Infinity;
  const after=assessRoomBallisticCover(site,room,[candidate]);
  if(beforeBallistic.approaches&&beforeBallistic.sampledPositions>=4){
   if(after.sampledPositions<Math.max(3,beforeBallistic.sampledPositions-3)||
      beforeBallistic.usableFiringCoverPositions>0&&
        !after.usableFiringCoverPositions)return -Infinity;
  }
  const ballistic=beforeBallistic.approaches&&beforeBallistic.sampledPositions>=4?
   Math.round(
    (after.blockedCrouchedFraction-beforeBallistic.blockedCrouchedFraction)*100+
    (after.blockedStandingFraction-beforeBallistic.blockedStandingFraction)*25+
    (after.usableFiringCoverPositions-beforeBallistic.usableFiringCoverPositions)*4+
    (after.crouchOnlyPositions-beforeBallistic.crouchOnlyPositions)*2-
    Math.max(0,beforeBallistic.protectedCrouched-after.protectedCrouched)*3):0;
  const sight=beforeSight.thresholds&&beforeSight.samples>=3?
   Math.round((Math.abs(beforeSight.exposedFraction-.58)-
      Math.abs(afterSight.exposedFraction-.58))*100):0;
  return ballistic+sight;
 };
}
