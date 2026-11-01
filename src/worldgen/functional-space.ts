/** Declared human use of each room, independent of decoration count.
 * These contracts are advisory until later physical planning stages adopt
 * reserved approaches and activity-based furniture placement.
 */
import type {Site,Room} from '../breach-site.ts';
export type UserGroup='resident'|'guest'|'customer'|'staff'|'service';
export type Activity='rest'|'eat'|'prepare'|'serve'|'browse'|'pay'|
 'wait'|'work'|'store'|'wash'|'repair'|'receive'|'circulate'|'examine';
export type FunctionalSpacePlan={
 roomId:string;zoneId:string;purpose:string;
 users:readonly UserGroup[];activities:readonly Activity[];
 /** Advisory upper bound on solid furniture footprint, not a hard ADA width. */
 maxSolidFraction:number;
 /** Priority for keeping space open: 3 = primary pedestrian flow. */
 routePriority:0|1|2|3;
 /** Distinguish main activity from opportunistic supplementary details. */
 essentialActivities:readonly Activity[];
};
type Profile=Omit<FunctionalSpacePlan,'roomId'|'zoneId'|'purpose'>;
const profile=(users:UserGroup[],activities:Activity[],maxSolidFraction:number,
 routePriority:0|1|2|3,essentialActivities:Activity[]=activities):Profile=>
 ({users,activities,maxSolidFraction,routePriority,essentialActivities});
const PROFILES:Readonly<Record<string,Profile>>={
 living:profile(['resident','guest'],['rest','circulate'],.30,2,['rest']),
 studio:profile(['resident'],['rest','prepare','wash','circulate'],.27,3,['rest','circulate']),
 dining:profile(['customer','resident'],['eat','circulate'],.30,2,['eat']),
 kitchen:profile(['staff','resident'],['prepare','wash','circulate'],.40,2,['prepare']),
 bedroom:profile(['resident','guest'],['rest'],.38,1),
 guest:profile(['guest'],['rest'],.39,1),
 bathroom:profile(['resident','guest'],['wash'],.46,1),
 'half-bath':profile(['resident','guest'],['wash'],.42,1),
 closet:profile(['resident','staff'],['store'],.52,1),
 'utility-closet':profile(['staff','service'],['store'],.50,1),
 restroom:profile(['customer','staff'],['wash'],.45,2),
 foyer:profile(['resident','guest'],['circulate','store'],.20,3,['circulate']),
 vestibule:profile(['guest','customer','staff'],['circulate'],.18,3),
 mudroom:profile(['resident'],['circulate','store'],.28,3,['circulate']),
 hallway:profile(['resident','guest','customer','staff'],['circulate'],.07,3),
 sales:profile(['customer','staff'],['browse','circulate'],.34,3,['browse','circulate']),
 checkout:profile(['customer','staff'],['pay','circulate'],.30,3,['pay','circulate']),
 reception:profile(['customer','guest','staff'],['wait','work','circulate'],.27,3,['work','circulate']),
 waiting:profile(['customer','guest'],['wait','circulate'],.23,3,['wait','circulate']),
 lobby:profile(['customer','guest'],['wait','circulate'],.22,3,['circulate']),
 office:profile(['staff'],['work','store'],.37,1,['work']),
 cubicles:profile(['staff'],['work','circulate'],.34,2,['work','circulate']),
 meeting:profile(['staff','guest'],['work','circulate'],.33,2,['work']),
 break:profile(['staff'],['rest','eat'],.33,1,['rest']),
 exam:profile(['staff','customer'],['examine','wash'],.37,2,['examine']),
 treatment:profile(['staff','customer'],['examine','wash'],.36,2,['examine']),
 staff:profile(['staff'],['work','store'],.35,1,['work']),
 supply:profile(['staff'],['store'],.46,1),
 stockroom:profile(['staff','service'],['store','receive'],.50,2,['store']),
 storage:profile(['resident','staff','service'],['store'],.53,1),
 pantry:profile(['staff','resident'],['store','prepare'],.50,1,['store']),
 utility:profile(['staff','service'],['store','repair'],.43,1,['repair']),
 laundry:profile(['resident','staff'],['wash','store'],.46,1,['wash']),
 'garage-storage':profile(['resident'],['store'],.51,1),
 study:profile(['resident'],['work','rest'],.36,1,['work']),
 bay:profile(['staff','service'],['repair','circulate'],.32,3,['repair','circulate']),
 workshop:profile(['staff'],['repair','work'],.40,2,['repair']),
 parts:profile(['staff'],['store','repair'],.49,1,['store']),
 loading:profile(['service','staff'],['receive','circulate'],.34,3,['receive','circulate']),
 aisle:profile(['staff','service'],['circulate','store'],.20,3,['circulate']),
 packing:profile(['staff'],['work','receive'],.38,2,['work']),
 equipment:profile(['staff','service'],['repair','work'],.39,2,['repair']),
 control:profile(['staff'],['work'],.39,1,['work']),
 service:profile(['staff','service'],['work','circulate'],.40,2,['work','circulate']),
 maintenance:profile(['staff'],['repair','store'],.45,1,['repair'])
};
const DEFAULT=profile(['resident','staff'],['store'],.40,1);
export function functionalSpacePlan(room:Room):FunctionalSpacePlan{
 const p=PROFILES[room.purpose??'']??DEFAULT;
 return {...p,roomId:room.id,zoneId:room.zoneId??room.id,
  purpose:room.purpose??'untyped'};
}
export function functionalSpaces(site:Pick<Site,'rooms'>):FunctionalSpacePlan[]{
 return site.rooms.map(functionalSpacePlan);
}
export function maxSolidOccupancy(room:Room):number{
 return functionalSpacePlan(room).maxSolidFraction;
}
