/** A3.0 read-only diagnostics from REAL Session/weapon/fire/motor APIs.
 * No gameplay module imports this file. No authorization or state changes.
 */
import {sessionWorldGeometry} from './breach-world-context.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {assessFireLane} from './breach-fire-safety.ts';
import {safetyBodyFor,FRIENDLY_CROUCH_VOLUMES,
 FRIENDLY_STAND_VOLUMES} from './breach-friendly-safety-volume.ts';
import {teammateAheadForHandling,handlingIntentForMovement}
 from './breach-handling-context.ts';
import {chooseCarry} from './breach-carry-policy.ts';
import {chooseFriendlyLaneStep} from './breach-combat-reactions.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {aimHeight} from './breach-cover-height.ts';
import {team,enemies,type Session} from './breach-game.ts';
import {doorLeafSegment,type Pt} from './breach-core.ts';
import {doorGripPhysicalContact} from './breach-physical-contact-anchor.ts';
import type {A3Config} from './a3-physicality-scenarios.ts';
export const A3_BASELINE_VERSION=2;
const round=(v:number)=>Number(v.toFixed(3));
const at=(p:Pt)=>({x:round(p.x),y:round(p.y)});
export type A3Probe=ReturnType<typeof probeA3>;
export function probeA3(s:Session,config:A3Config){
 const shooter=team(s)[0],target=enemies(s)[0];
 const world=sessionWorldGeometry(s);
 const active=team(s).filter(a=>a.health>0).slice(0,config.operators);
 const friends=active.filter(a=>a!==shooter).map(safetyBodyFor);
 const legacyFriends=active.filter(a=>a!==shooter).map(a=>a.p);
 const intent=handlingIntentForMovement({
  order:shooter.plan[0]??null,running:shooter.pace==='run',
  squeezing:!!shooter.squeeze,traversing:!!shooter.traversal,
  reloading:shooter.reload>0,treating:!!shooter.treatmentActive,
  hasContact:config.intent==='engage',
  hasAuthoredWatch:config.intent==='watch'||config.intent==='look',
  speed:shooter.velocity
 });
 const friendlyAhead=teammateAheadForHandling(shooter.p,shooter.heading,
  active,shooter);
 const range=Math.hypot(target.p.x-shooter.p.x,target.p.y-shooter.p.y);
 const request={x:shooter.p.x,z:shooter.p.y,
  heading:shooter.heading,weaponYaw:shooter.weaponYaw,
  shoulderOffset:shooter.aimSideOffset??0,
  weapon:shooter.weapon,weaponConfiguration:shooter.weaponConfiguration,
  equipment:shooter.equipment,aim:shooter.aim,
  posture:shooter.posture,velocity:shooter.velocity,recoil:shooter.recoil,
  threatRange:range} as const;
 // Gameplay's actual shot-time check intentionally does NOT let nearby
 // allies change rigid gun geometry. Projectiles still get independent
 // full-lane teammate safety checks at ignition.
 const shotClearance=weaponClearance(request,s.doors,world.cover,world.walls);
 // Presentation currently probes nearby friendlies too; keep both results
 // visible instead of claiming the two different sources are identical.
 const visualClearance=weaponClearance({
  ...request,friendlyAhead,friendlyNear:friendlyAhead,handlingIntent:intent
 },s.doors,world.cover,world.walls,friends);
 const from={x:shotClearance.muzzle.x,y:shotClearance.muzzle.z};
 const targetHeight=aimHeight(target.posture==='crouch');
 const lane=assessFireLane(from,shotClearance.muzzle.y,target.p,
  targetHeight,world.cover,world.walls,s.doors,friends);
 const legacyLane=assessFireLane(from,shotClearance.muzzle.y,target.p,
  targetHeight,world.cover,world.walls,s.doors,legacyFriends);
 let candidateChecks=0;
 const canMove=(next:Pt)=>{
  candidateChecks++;
  return sweptBodyClear(shooter.p,next,s.doors,8,world)&&
   active.filter(a=>a!==shooter).every(a=>
    Math.hypot(a.p.x-next.x,a.p.y-next.y)>=20);
 };
 const canShoot=(next:Pt)=>{
  candidateChecks++;
  const result=weaponClearance({...request,x:next.x,z:next.y},
   s.doors,world.cover,world.walls);
  if(result.blocked)return false;
  return assessFireLane({x:result.muzzle.x,y:result.muzzle.z},
   result.muzzle.y,target.p,targetHeight,world.cover,world.walls,
   s.doors,friends).blocker==='clear';
 };
 // Legacy candidate is a *read-only* illustration of current game behavior,
 // never a newly authorized move or predicted safe shot.
 const legacy=lane.blocker==='friendly'?
  chooseFriendlyLaneStep(shooter.p,shooter.weaponYaw,canMove,canShoot):null;
 const carry=chooseCarry({aim:shooter.aim,moving:Math.min(1,shooter.velocity/72),
  obstruction:visualClearance.obstruction,friendlyNear:friendlyAhead,
  friendlyAhead,intent,weapon:shooter.weapon,threatRange:range});
 const doorContacts=active.filter(a=>a.doorHandContact).map(a=>({
  id:a.id,doorId:a.doorHandContact!.doorId,
  mode:a.doorHandContact!.mode,
  point:at(a.doorHandContact!.point),
  attached:a.doorHandContact!.releasedAt===null
 }));
 // A3.5 reports only fixed-tick motor-owned D4 contacts; the probe never
 // produces an unearned new surface/teammate attachment.
 const contactAnchors=active.flatMap(a=>{
  const grip=a.doorHandContact;
  const door=grip?s.doors.find(d=>d.id===grip.doorId):null;
  const contact=grip&&door?doorGripPhysicalContact(grip.doorId,grip,
    doorLeafSegment(door),a.p):a.physicalContact;
  if(!contact)return [];
  return [{operatorId:a.id,kind:contact.intent,
   limb:contact.limb,target:contact.anchor.target,
   targetId:contact.anchor.id,
   point:{x:round(contact.anchor.point.x),
     y:round(contact.anchor.point.y),z:round(contact.anchor.point.z)},
   normal:{x:round(contact.anchor.normal.x),
     y:round(contact.anchor.normal.y),z:round(contact.anchor.normal.z)},
   attached:contact.releasedAt===null,
   startedAt:round(contact.startedAt),
   releasedAt:contact.releasedAt===null?null:round(contact.releasedAt)}];
 });
 return {
  version:A3_BASELINE_VERSION,config:{...config},
  seconds:round(s.seconds),phase:s.phase,
  shooter:{id:shooter.id,position:at(shooter.p),
   heading:round(shooter.heading),weaponYaw:round(shooter.weaponYaw),
   posture:shooter.posture,velocity:round(shooter.velocity),
   weapon:shooter.weapon,aim:round(shooter.aim),
   firePolicy:shooter.firePolicy,lastFireBlock:shooter.lastFireBlock,
   recovery:shooter.fireRetreatTarget?at(shooter.fireRetreatTarget):null,
   correction:shooter.fireRetreatReason??null,
   blockedTime:round(shooter.blockedTime),planCount:shooter.plan.length,
   shoulderOffset:round(shooter.aimSideOffset??0),
   shoulderTarget:round(shooter.aimSideTarget??0),
   autoCrouchUntil:round(shooter.autoCrouchUntil??0)},
  target:{id:target.id,position:at(target.p),posture:target.posture,
   health:target.health},
  allies:active.filter(a=>a!==shooter).map(a=>({
   id:a.id,position:at(a.p),posture:a.posture,
   heading:round(a.heading),velocity:round(a.velocity),
   blockedTime:round(a.blockedTime),
   shoulderOffset:round(a.aimSideOffset??0),
   autoCrouchUntil:round(a.autoCrouchUntil??0),
   protectedTop:a.posture==='crouch'?
    FRIENDLY_CROUCH_VOLUMES[1].top:FRIENDLY_STAND_VOLUMES[1].top
  })), 
  carry:{handling:carry.handling,reason:carry.reason,intent,
   friendlyAhead},
  shot:{muzzle:{x:round(shotClearance.muzzle.x),
    y:round(shotClearance.muzzle.y),z:round(shotClearance.muzzle.z),
    yaw:round(shotClearance.muzzle.yaw)},
   hardBlocked:shotClearance.blocked,weaponBlocker:shotClearance.blocker,
   lane:lane.blocker,
   legacyPlanarLane:legacyLane.blocker,
   changedByHeight:lane.blocker!==legacyLane.blocker,
   authorizedByGeometry:!shotClearance.blocked&&lane.blocker==='clear',
   // Diagnostic only; engine also requires policy/target/fire cadence.
   origin:at(from),destination:at(target.p)},
  presentation:{muzzle:{x:round(visualClearance.muzzle.x),
    y:round(visualClearance.muzzle.y),z:round(visualClearance.muzzle.z)},
   blocked:visualClearance.blocked,blocker:visualClearance.blocker,
   compression:round(visualClearance.compression)},
  legacyRecovery:{candidate:legacy?at(legacy):null,
   checks:candidateChecks,appliedByMotor:!!shooter.fireRetreatTarget},
  doorContacts,contactAnchors,
  doors:s.doors.map(d=>({id:d.id,open:!!d.open,
   fraction:round(d.openFraction??0)})),
  // Legacy comparator remains exactly 10.5 units at every height.
  friendlyPlanarRadius:10.5,
  friendlyVolumes:{standing:FRIENDLY_STAND_VOLUMES,
   crouched:FRIENDLY_CROUCH_VOLUMES},
  limitations:['no-micro-aim-solver','no-auto-crouch',
   'pose-not-shot-authority']
 };
}
