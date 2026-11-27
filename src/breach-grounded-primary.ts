/** WR10: world ownership for a temporarily grounded primary. Uses the
 * existing Session firearm registry; no duplicate inventory or evidence. */
import type {Session,TeamActor} from './breach-game.ts';
import {readSlingKind} from './breach-weapon-retention.ts';
import {droppedWeaponPosition,type DroppedFirearm} from './breach-suspect-weapons.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {sweptBodyClear} from './breach-navigation.ts';
export const hasGroundedPrimary=(a:Pick<TeamActor,'groundedPrimaryId'>)=>a.groundedPrimaryId!=null;
export function usesUnslungPlacement(s:Session,a:TeamActor){
 return a.side==='blue'&&!!a.weaponConfiguration&&
  readSlingKind(a.weaponConfiguration.slots.sling)==='none'&&
  Array.isArray(s.droppedFirearms)&&Array.isArray(s.doors)&&
  Array.isArray(s.coverState)&&Array.isArray(s.civilians);
}
export function ownGroundedPrimary(s:Session,a:TeamActor):DroppedFirearm|undefined{
 return s.droppedFirearms?.find(w=>w.id===a.groundedPrimaryId&&w.ownerId===a.id&&
  w.temporaryPlacement===true&&w.status==='loose'&&!w.secondaryWeapon);
}
export function canRetrieveGroundedPrimary(s:Session,a:TeamActor){
 const item=ownGroundedPrimary(s,a);
 return !!item&&a.health>0&&Math.hypot(a.p.x-item.p.x,a.p.y-item.p.y)<=30&&
  sweptBodyClear(a.p,item.p,s.doors,1.5,sessionWorldGeometry(s));
}
export function retrieveGroundedPrimary(s:Session,a:TeamActor):boolean{
 const item=ownGroundedPrimary(s,a);
 if(!item||!canRetrieveGroundedPrimary(s,a))return false;
 // Weapon identity and stored ammunition stay exactly as placed.
 a.magazine=item.loadedRounds;a.reserve=item.reserveRounds;a.insertedMagazineId=item.magazineId;
 item.status='retrieved';a.groundedPrimaryId=null;a.primaryPlacement=undefined;
 return true;
}
export function prepareGroundedPrimary(s:Session,a:TeamActor,dt:number):boolean{
 if(hasGroundedPrimary(a))return true; // Primary is already off-body, even if secured by someone else.
 if(!usesUnslungPlacement(s,a))return true;
 if(a.reload>0||a.secondaryReload)return false;
 const order=a.plan[0]?.id??-1;
 const prior=a.primaryPlacement;
 const elapsed=(prior?.order===order&&prior.kind==='place'?prior.elapsed:0)+dt;
 a.velocity=0;a.aim=0;a.primaryPlacement={order,kind:'place',elapsed};
 if(elapsed<.48)return false;
 const point=droppedWeaponPosition(s,a);
 if(!sessionWorldGeometry(s).passable(point,1.5)||
    !sweptBodyClear(a.p,point,s.doors,1.5,sessionWorldGeometry(s)))return false;
 const item:DroppedFirearm={id:s.nextEffectId++,ownerId:a.id,p:point,
  heading:a.heading,at:s.seconds,weapon:a.weapon,
  weaponConfiguration:a.weaponConfiguration?structuredClone(a.weaponConfiguration):undefined,
  loadedRounds:a.magazine,reserveRounds:a.reserve,magazineId:a.insertedMagazineId,
  status:'loose',temporaryPlacement:true};
 s.droppedFirearms.push(item);a.groundedPrimaryId=item.id;
 a.primaryPlacement={order,kind:'placed',elapsed:0};
 return true;
}
/** Automatic pickup only if the exact world item remains within reach.
 * Moving away or another actor securing it never teleports it back. */
export function advanceGroundRecovery(s:Session,a:TeamActor,dt:number):boolean{
 const order=a.plan[0];
 if(!hasGroundedPrimary(a)){
  if(a.primaryPlacement?.order!==order?.id)a.primaryPlacement=undefined;
  return false;
 }
 if(a.health<=0||a.surrendered||a.carryingId)return false;
 if(a.primaryPlacement?.kind==='placed'&&a.primaryPlacement.order===order?.id)return false;
 if(order?.kind==='switch-weapon'&&(order.weaponHand??'secondary')==='secondary'||
    (a.secondarySwitch?.fraction??0)>0)return false;
 if(order?.interaction==='secure-firearm'&&order.objectId==='weapon:'+a.groundedPrimaryId)return false;
 if(!canRetrieveGroundedPrimary(s,a))return false;
 const elapsed=(a.primaryPlacement?.kind==='retrieve'?a.primaryPlacement.elapsed:0)+dt;
 a.primaryPlacement={order:order?.id??-1,kind:'retrieve',elapsed};
 a.velocity=0;a.aim=0;
 if(elapsed>=.48)retrieveGroundedPrimary(s,a);
 return true;
}
