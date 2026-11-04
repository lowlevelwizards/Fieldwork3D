/** R7B: reward usable crouch cover and fire-back lanes, rather than
 * merely hiding the room behind more tall furniture.
 * Does not supply new props, alter physical collision, or award free cover.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {assessRoomBallisticCover} from './room-cover-audit.ts';
import {engagementRoomRelevant} from './room-sightline-audit.ts';

/** Only room-appropriate substantial fixtures are ranked by tactical utility;
 * decorative chairs, plants, sanitary essentials and loose knickknacks are
 * still positioned by their everyday functional arrangement. */
export const tacticalFurnitureFamily=(fixture:string)=>
 /(?:desk|counter|sofa|bookcase|shelf|rack|cabinet|workbench|island|pallet|bed|booth|crate|dresser|display|bench|locker|shelter)/.test(fixture);

export function ballisticFurnishingValue(site:Site,room:Room,candidate:Obstacle,
 pending:readonly Obstacle[]):number{
 if(!engagementRoomRelevant(room)||!tacticalFurnitureFamily(candidate.fixture??''))
  return 0;
 const base={...site,cover:[...site.cover,...pending]};
 const before=assessRoomBallisticCover(base,room);
 if(!before.approaches||before.sampledPositions<4)return 0;
 const after=assessRoomBallisticCover(base,room,[candidate]);
 if(after.sampledPositions<Math.max(3,before.sampledPositions-3))
  return -Infinity;
 // No furnishing may destroy the sole usable protected firing position.
 if(before.usableFiringCoverPositions>0&&!after.usableFiringCoverPositions)
  return -Infinity;
 return Math.round(
  (after.blockedCrouchedFraction-before.blockedCrouchedFraction)*100+
  (after.blockedStandingFraction-before.blockedStandingFraction)*25+
  (after.usableFiringCoverPositions-before.usableFiringCoverPositions)*4+
  (after.crouchOnlyPositions-before.crouchOnlyPositions)*2-
  Math.max(0,before.protectedCrouched-after.protectedCrouched)*3);
}
