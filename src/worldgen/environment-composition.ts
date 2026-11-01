/** Visual clutter has its own budget. Physical furniture and mandatory
 * fixtures are decided elsewhere. A large room can remain largely open.
 * Surface props never create collisions or substitute required equipment.
 */
import type {Room} from '../breach-site.ts';
export type DressingIntensity='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
const activityBands:Record<string,number>={
 living:2,studio:2,bedroom:2,guest:2,study:2,
 dining:2,waiting:2,lobby:2,reception:2,checkout:2,
 restroom:1,bathroom:1,foyer:1,vestibule:1,
 office:3,cubicles:2,meeting:2,
 kitchen:3,service:3,pantry:3,stockroom:4,storage:4,
 sales:3,packing:3,loading:3,
 bay:3,workshop:4,parts:4,equipment:3,control:2,
 exam:2,treatment:2,supply:3
};
export function surfaceDetailBudget(room:Room,
 condition:DressingIntensity):number{
 if(room.kind==='hall')return 0;
 const band=activityBands[room.purpose??'']??2;
 const area=room.w*room.h;
 if(area<5600)return Math.min(1,band);
 const sizeBonus=area>=38000?2:area>=19000?1:0;
 const conditionBonus=condition==='busy'||condition==='disturbed'?1:
  condition==='vacant'?-1:0;
 return Math.max(0,Math.min(6,band+sizeBonus+conditionBonus));
}
