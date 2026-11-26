/** D15.6: unrestrained surrender is a physical state, not permanent AI removal.
 * Every opportunity is checked on the fixed tick; actual hand contact, LOS,
 * one world-weapon ID and recorded equipment are the only rearm authorities.
 * This never simulates a new weapon, AI team, bullet or navigation motor.
 */
import {OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {advanceSecondarySwitch,initialSecondarySwitch}
 from './secondary-switching.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {DroppedFirearm} from './breach-suspect-weapons.ts';
import {bestBelief} from './breach-awareness.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a:Pt,b:Pt)=>Math.atan2(b.y-a.y,b.x-a.x);
const delta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const SUSPECT_ESCAPE_DELAY={aggressor:5,guard:7,cautious:10};
export const SUSPECT_REARM_CONTACT=18;
export const SUSPECT_REARM_SECONDS=1.05;
export const SUSPECT_SECONDARY_PREPARE_SECONDS=.78;
export const SUSPECT_ESCAPE_COOLDOWN=3.5;
type Probe= (from:Pt,to:Pt,s:Session,lowBlocks:boolean)=>boolean;
export type OpportunityPort={
 unobstructed:Probe;
 runCustody:(s:Session,a:TeamActor,goal:Pt,h:number)=>void;
 notify:(s:Session,message:string)=>void;
 battleEvent:(s:Session,kind:BattleEvent['kind'],actor:TeamActor|null,
  p:Pt,text:string,meta?:BattleEvent['meta'])=>void;
};
/** A close blue operator or a blue operator actively looking along a clear
 * corridor prevents quiet escape preparation. A hidden operator behind a
 * wall is NOT a magical supervisor; no contact guesses are used for travel.
 */
export function suspectIsSupervised(s:Session,a:TeamActor,clear:Probe):boolean{
 for(const b of s.operators){
  if(b.side!=='blue'||b.health<=0)continue;
  const range=dist(a.p,b.p);
  if(range>145)continue;
  if(range>36&&Math.abs(delta(b.heading,angle(b.p,a.p)))>1.13)continue;
  if(clear(b.p,a.p,s,false))return true;
 }
 return false;
}
export function canAttemptSuspectEscape(
 a:Pick<TeamActor,'side'|'health'|'surrendered'|'restrained'|
 'lastSurrenderAt'|'suspectEscapeCooldownUntil'|'personality'|'suppression'>,
 now:number,supervised:boolean):boolean{
 return a.side==='red'&&a.health>0&&a.surrendered===true&&
  a.restrained!==true&&!supervised&&a.suppression<.28&&
  Number.isFinite(a.lastSurrenderAt)&&
  (a.lastSurrenderAt??-1)>=0&&
  now-(a.lastSurrenderAt??now)>=SUSPECT_ESCAPE_DELAY[a.personality]&&
  now>=(a.suspectEscapeCooldownUntil??0);
}
function ownLooseGun(s:Session,a:TeamActor):DroppedFirearm|null{
 return s.droppedFirearms.find(w=>w.id===a.releasedWeaponId&&
  w.ownerId===a.id&&w.status==='loose'&&
  (!w.secondaryWeapon||!!w.secondaryEquipment?.weapon))??null;
}
function availableSidearm(a:TeamActor):boolean{
 const kit=a.equipment?.secondary;
 return a.suspectSearched!==true&&!!kit?.weapon&&
  (kit.loadedRounds>0||kit.spareMagazines.some(m=>m.rounds>0));
}
function chooseFlightGoal(s:Session,a:TeamActor):Pt|null{
 const world=sessionWorldGeometry(s);
 // Heading and last personally experienced contact, not the hidden squad.
 const remembered=bestBelief(a.awareness)?.estimate??a.contact;
 const away=remembered?angle(remembered,a.p):a.heading+Math.PI;
 for(const yaw of [away,away+.65,away-.65,away+1.3,away-1.3]){
  const p={x:a.p.x+Math.cos(yaw)*76,y:a.p.y+Math.sin(yaw)*76};
  if(world.passable(p)&&
   sweptBodyClear(a.p,p,s.doors,OPERATOR_RADIUS,world))return p;
 }
 return null;
}
function endAttempt(a:TeamActor,now:number,interrupt:boolean):void{
 a.suspectEscapeMode=null;a.suspectEscapeWeaponId=null;
 a.suspectEscapeGoal=null;a.suspectEscapeStartedAt=-100;
 a.suspectEscapeCooldownUntil=now+(interrupt?SUSPECT_ESCAPE_COOLDOWN:5);
 a.nav=[];a.velocity=0;
 if(a.secondarySwitch.desired==='secondary'&&a.surrendered)
  a.secondarySwitch={...a.secondarySwitch,desired:'primary'};
}
/** Actual pickup only, after reaching the same world gun for >1 second,
 * while that identity remains loose. No magically refilled magazine.
 */
function retrieveGun(s:Session,a:TeamActor,w:DroppedFirearm):boolean{
 if(w.status!=='loose'||w.ownerId!==a.id||
   a.releasedWeaponId!==w.id||a.restrained||a.health<=0||
   !a.surrendered||dist(a.p,w.p)>SUSPECT_REARM_CONTACT|| 
   !sweptBodyClear(a.p,w.p,s.doors,5.5,sessionWorldGeometry(s)))return false;
 if(w.secondaryWeapon){
  if(!w.secondaryEquipment?.weapon||
     w.secondaryEquipment.weapon!==w.secondaryWeapon)return false;
  a.equipment={...a.equipment!,secondary:structuredClone(w.secondaryEquipment)};
  a.secondarySwitch={active:'secondary',desired:'secondary',fraction:1};
  a.suspectRearmedSecondary=true;
 }else{
  a.weapon=w.weapon;
  a.weaponConfiguration=w.weaponConfiguration?
   structuredClone(w.weaponConfiguration):undefined;
  a.magazine=w.loadedRounds;a.reserve=w.reserveRounds;
  a.insertedMagazineId=w.magazineId;
  a.secondarySwitch=initialSecondarySwitch();
  a.suspectRearmedSecondary=false;
 }
 w.status='retrieved';
 a.surrendered=false;a.releasedWeaponId=null;
 a.combatChoice=null;a.aim=0;a.fireCd=Math.max(a.fireCd,.5);
 return true;
}
/** Live, bounded state machine. No RNG, no global AI tick, no secondary actor.
 * The existing motor and shot resolver remain the sole physics/fire writers.
 */
export function advanceSurrenderOpportunity(
 s:Session,a:TeamActor,h:number,port:OpportunityPort):void{
 if(a.side!=='red'||a.health<=0||!a.surrendered||a.restrained){
  if(a.suspectEscapeMode)endAttempt(a,s.seconds,true);
  return;
 }
 const supervised=suspectIsSupervised(s,a,port.unobstructed);
 if(supervised||a.suppression>=.28){
  if(a.suspectEscapeMode)endAttempt(a,s.seconds,true);
  else if(a.secondarySwitch.fraction>0&&
    a.secondarySwitch.desired==='secondary')
    a.secondarySwitch={...a.secondarySwitch,desired:'primary'};
  a.secondarySwitch=advanceSecondarySwitch(a.secondarySwitch,h,
    a.equipment?.secondary,true);
  a.velocity=0;return;
 }
 if(!a.suspectEscapeMode){
  if(!canAttemptSuspectEscape(a,s.seconds,supervised)){
   a.velocity=0;
   a.secondarySwitch=advanceSecondarySwitch(a.secondarySwitch,h,
     a.equipment?.secondary,true);
   return;
  }
  const gun=ownLooseGun(s,a);
  const goal=gun&&dist(a.p,gun.p)<=120?gun.p:null;
  const mode:NonNullable<TeamActor['suspectEscapeMode']>=goal?
   'recover':availableSidearm(a)?'secondary':'flee';
  const flight=mode==='flee'?chooseFlightGoal(s,a):null;
  if(mode==='flee'&&!flight){
   // An impossible site lane must not trigger five geometric sweeps 60Hz.
   a.velocity=0;a.suspectEscapeCooldownUntil=s.seconds+5;return;
  }
  a.suspectEscapeMode=mode;a.suspectEscapeWeaponId=goal?gun!.id:null;
  a.suspectEscapeStartedAt=s.seconds;
  a.suspectEscapeGoal=goal?{...goal}:flight;
  a.nav=[];a.velocity=0;
  const text=a.name+(mode==='flee'?' ATTEMPTING TO ESCAPE':
   mode==='recover'?' REACHING FOR DROPPED WEAPON':
   ' REACHING FOR CONCEALED SIDEARM');
  port.notify(s,text);
  port.battleEvent(s,'interaction',a,a.p,text,{
   action:mode==='flee'?'suspect-escape':'suspect-rearm-attempt',
   targetId:a.id,...(gun&&goal?{objectId:'weapon:'+gun.id}:{})
  });
 }
 const mode=a.suspectEscapeMode;
 if(mode==='recover'){
  const gun=s.droppedFirearms.find(w=>w.id===a.suspectEscapeWeaponId&&
    w.ownerId===a.id&&w.status==='loose');
  if(!gun){endAttempt(a,s.seconds,true);return;}
  const range=dist(a.p,gun.p);
  if(range>SUSPECT_REARM_CONTACT){
   if(range>135){endAttempt(a,s.seconds,true);return;}
   port.runCustody(s,a,gun.p,h);
   // Contact timer begins only after physical arrival.
   a.suspectEscapeStartedAt=s.seconds;
   return;
  }
  a.velocity=0;a.nav=[];
  if(!sweptBodyClear(a.p,gun.p,s.doors,5.5,
     sessionWorldGeometry(s))){endAttempt(a,s.seconds,true);return;}
  if(s.seconds-(a.suspectEscapeStartedAt??s.seconds)<SUSPECT_REARM_SECONDS)
   return;
  if(!retrieveGun(s,a,gun)){endAttempt(a,s.seconds,true);return;}
  const text=a.name+' RECOVERED DROPPED FIREARM';
  port.notify(s,text);
  port.battleEvent(s,'interaction',a,a.p,text,{
   action:'suspect-rearmed',targetId:a.id,objectId:'weapon:'+gun.id});
  endAttempt(a,s.seconds,false);return;
 }
 if(mode==='secondary'){
  const kit=a.equipment?.secondary;
  if(!availableSidearm(a)||!kit?.weapon){
   endAttempt(a,s.seconds,true);return;
  }
  a.velocity=0;a.nav=[];
  if(s.seconds-(a.suspectEscapeStartedAt??s.seconds)<
     SUSPECT_SECONDARY_PREPARE_SECONDS)return;
  a.secondarySwitch=advanceSecondarySwitch({
    ...a.secondarySwitch,desired:'secondary'
  },h,kit,true);
  if(a.secondarySwitch.active!=='secondary'||a.secondarySwitch.fraction<1)return;
  // A physically issued, actually drawn pistol; primary remains on floor.
  a.suspectRearmedSecondary=true;a.surrendered=false;a.aim=0;
  a.fireCd=Math.max(a.fireCd,.5);a.combatChoice=null;
  const text=a.name+' DREW CONCEALED SIDEARM';
  port.notify(s,text);
  port.battleEvent(s,'interaction',a,a.p,text,{
    action:'suspect-armed-secondary',targetId:a.id});
  endAttempt(a,s.seconds,false);return;
 }
 if(mode==='flee'){
  const goal=a.suspectEscapeGoal;
  if(!goal){endAttempt(a,s.seconds,true);return;}
  if(dist(a.p,goal)<13){
   endAttempt(a,s.seconds,false);return;
  }
  port.runCustody(s,a,goal,h);
 }
}
