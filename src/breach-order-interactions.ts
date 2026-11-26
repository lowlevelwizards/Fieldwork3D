import {assessTacticalAction} from './breach-action-assessment.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {PERSON_CONTACT_REACH} from './breach-person-contact-standpoint.ts';
import {resolvePhysicalContactEpisode,advancePhysicalContactTime,
 type PhysicalContactAction}
 from './breach-physical-contact-episode.ts';
/** Stage 8: civilian custody/escort, physical prop pushing and window
 * actions. Target/reach checks are unchanged and failed orders remain.
 */
import {OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {setCivilianState} from './breach-civilian-types.ts';
import {RESTRAINT_CONTACT_SECONDS} from './equipment-interaction-timings.ts';
import {dropCivilianCustody} from './breach-civilian-transport.ts';
import {canSecureRescuePerson} from './breach-civilian-mission.ts';
import {CIVILIAN_VOICE_RANGE} from './breach-civilian-context-selection.ts';
import {SUSPECT_CHALLENGE_RANGE,SUSPECT_CHALLENGE_SECONDS,
 SUSPECT_ESCORT_VOICE_RANGE,
 challengeSuspectDecision,commitSuspectSurrender} from './breach-suspect-compliance.ts';
import {canRelocateCover,coverPushDistance} from './breach-movable-cover.ts';
import {coverTargetIndex} from './worldgen/site-object-identity.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {manipulateWindow} from './breach-windows.ts';
import {windowCanBash,windowBashPoint,windowBashLaneClear,WINDOW_BASH_WINDUP} from './breach-window-bash.ts';
import {powerControlAt,controlPosition,POWER_CONTROL_REACH,
 POWER_ACTION_SECONDS} from './equipment-site-power-controls.ts';
import {setSiteCircuitPower,setSiteFixtureSwitch} from './equipment-site-power.ts';
import {completeOrder,clearCurrentOrderIssue,rotate,
 failCurrentOrder as failOrder} from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const clone=(p:Pt):Pt=>({...p});
const pop=completeOrder;
export function createInteractionOrderHandler(port:OrderExecutionPort){
 // Per-order resolution, not a global actor/prop lookup every frame. Weak
 // references evaporate when a plan is edited, completed or replayed.
 const pushTargets=new WeakMap<PlanNode,{token:string;index:number}>();
 const {approach,notify,battleEvent,liveVisibility,movePhysicalProp,hear}=port;
 const failCurrentOrder=(s:Session,a:TeamActor,n:PlanNode,reason:string)=>
  failOrder(s,a,n,reason,port.notify);
 /** Shared GO-only physical stance policy. Full-body contact and movement
  * remain controlled by the real Session geometry and the existing motor.
  * The target can be a person or the precise dropped world item.
  */
 const contactEpisode=(s:Session,a:TeamActor,n:PlanNode,target:Pt,
  action:PhysicalContactAction,handLaneClear:boolean,
  ignoredCivilianId:string|null=null)=>{
  const firearm=action==='secure-firearm';
  const world=sessionWorldGeometry(s);
  return resolvePhysicalContactEpisode({
   action,from:a.p,target,authoredAt:n.p,handLaneClear,
   targetVisible:liveVisibility(s,target),
   canStand:p=>world.passable(p,OPERATOR_RADIUS)&&
    sweptBodyClear(a.p,p,s.doors,OPERATOR_RADIUS,world)&&
    !s.operators.some(e=>e!==a&&e.health>0&&
      d(e.p,p)<(firearm?18:21))&&
    !s.civilians.some(c=>c.id!==ignoredCivilianId&&c.health>0&&
      d(c.p,p)<(firearm?18:20))
  });
 };
 /** A progress sample is never an action success. The caller has already
  * revalidated live hand reach, sightline and facing at this fixed tick.
  */
 const continueContact=(a:TeamActor,dt:number,duration:number):boolean=>{
  const state=advancePhysicalContactTime(a.actionTimer,dt,duration);
  a.actionTimer=state.elapsed;
  return state.complete;
 };
 return function executeInteractionOrder(s:Session,a:TeamActor,n:PlanNode,dt:number):boolean{
  if(n.kind==='interact'){
    if(!n.objectId||!n.interaction){
      failCurrentOrder(s,a,n,'INTERACTION TARGET UNAVAILABLE');return true;
    }
    const contactCommand=(n.objectId.startsWith('civ:')&&
      (n.interaction==='secure-civilian'||
       n.interaction==='follow-civilian'||
       n.interaction==='stop-following-civilian'||
       n.interaction==='restrain-civilian'))||
      (n.objectId.startsWith('suspect:')&&
        (n.interaction==='restrain-suspect'||n.interaction==='search-suspect'||
         n.interaction==='escort-suspect'||n.interaction==='stop-escorting-suspect'))||
      (n.objectId.startsWith('weapon:')&&n.interaction==='secure-firearm');
    if(!contactCommand&&!near(a.p,n.p,7)){
      // Once an electrical action has begun, losing the contact position
      // cancels it rather than letting an absent hand finish remotely.
      if((n.interaction==='power-on'||n.interaction==='power-off')&&
         a.actionTimer>0){
        failCurrentOrder(s,a,n,'POWER CONTROL CONTACT LOST');return true;
      }
      approach(a,n.p,dt,s,.65);return true;
    }
    if(n.interaction==='challenge-suspect'){
      const suspect=s.operators.find(e=>e.side==='red'&&
        n.objectId==='suspect:'+e.id);
      const range=suspect?d(a.p,suspect.p):Infinity;
      if(!suspect||!assessTacticalAction({
        action:'challenge-suspect',phase:'go',
        actorAvailable:a.health>0,targetAvailable:suspect.health>0,
        domainEligible:true,distance:range,
        maximumRange:SUSPECT_CHALLENGE_RANGE,
        unobstructed:range<=SUSPECT_CHALLENGE_RANGE&&
          sweptBodyClear(a.p,suspect.p,s.doors,1.5,sessionWorldGeometry(s))
      }).allowed){
        failCurrentOrder(s,a,n,'SUSPECT NOT VISIBLE OR IN SPEAKING RANGE');
        return true;
      }
      // The explicit CHALLENGE first turns the speaker toward the known
      // suspect. FOV is not a prerequisite for beginning the turn; the
      // physically unobstructed speaking lane is still checked each tick.
      a.velocity=0;
      if(!rotate(a,Math.atan2(suspect.p.y-a.p.y,
        suspect.p.x-a.p.x),dt,s))return true;
      a.actionTimer+=dt;
      if(a.actionTimer<SUSPECT_CHALLENGE_SECONDS)return true;
      const decision=challengeSuspectDecision(suspect,s.seconds);
      if(decision==='cooldown'){
        failCurrentOrder(s,a,n,'SUSPECT WAS RECENTLY CHALLENGED');return true;
      }
      if(decision==='ineligible'){
        failCurrentOrder(s,a,n,'SUSPECT NO LONGER ACTIVE');return true;
      }
      suspect.lastChallengeAt=s.seconds;
      hear(s,a.p,100,'warning');
      battleEvent(s,'interaction',a,a.p,a.name+' CHALLENGED '+suspect.name,
        {action:'suspect-challenge',targetId:suspect.id,contributorId:a.id});
      if(decision==='surrender')
        commitSuspectSurrender(s,suspect,notify,battleEvent,'challenge',a.id);
      else{
        const text=suspect.name+' REFUSED CHALLENGE';
        notify(s,text);
        battleEvent(s,'interaction',a,a.p,text,
          {action:'suspect-refusal',targetId:suspect.id,contributorId:a.id});
      }
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='restrain-suspect'){
      const suspect=s.operators.find(e=>e.side==='red'&&
        n.objectId==='suspect:'+e.id);
      if(!suspect||suspect.health<=0||!suspect.surrendered||
         suspect.restrained===true||a.health<=0){
        failCurrentOrder(s,a,n,'SUSPECT NOT AVAILABLE FOR RESTRAINT');return true;
      }
      const range=d(a.p,suspect.p);
      const clear=sweptBodyClear(a.p,suspect.p,s.doors,1.5,
        sessionWorldGeometry(s));
      const contact=contactEpisode(s,a,n,suspect.p,
        'restrain-suspect',clear);
      if(contact.kind==='approach'){
        approach(a,contact.goal,dt,s,.65);return true;
      }
      if(contact.kind!=='ready'||!assessTacticalAction({
        action:'restrain-suspect',phase:'go',
        actorAvailable:true,targetAvailable:true,domainEligible:true,
        distance:range,maximumRange:PERSON_CONTACT_REACH,
        unobstructed:clear
      }).allowed){
        failCurrentOrder(s,a,n,'SUSPECT OUT OF REACH OR OBSTRUCTED');return true;
      }
      a.velocity=0;
      const toward=Math.atan2(suspect.p.y-a.p.y,suspect.p.x-a.p.x);
      if(!rotate(a,toward,dt,s))return true;
      if(!continueContact(a,dt,RESTRAINT_CONTACT_SECONDS))return true;
      suspect.restrained=true;suspect.lastCustodyAt=s.seconds;
      // Completing physical cuffs interrupts any pending escape, hand
      // retrieval or partially drawn pistol at the exact GO-time tick.
      suspect.suspectEscapeMode=null;suspect.suspectEscapeGoal=null;
      suspect.suspectEscapeWeaponId=null;
      suspect.suspectEscapeStartedAt=-100;
      suspect.suspectEscapeCooldownUntil=s.seconds+5;
      if(suspect.secondarySwitch.desired==='secondary'&&
         suspect.surrendered){
        suspect.secondarySwitch={...suspect.secondarySwitch,
          desired:'primary'};
      }
      const message=a.name+' RESTRAINED '+suspect.name;
      notify(s,message);
      battleEvent(s,'interaction',a,a.p,message,{
        action:'suspect-restrained',targetId:suspect.id,contributorId:a.id});
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='escort-suspect'||
       n.interaction==='stop-escorting-suspect'){
      const suspect=s.operators.find(e=>e.side==='red'&&
        n.objectId==='suspect:'+e.id);
      if(!suspect||suspect.health<=0||suspect.surrendered!==true||
         a.health<=0){
        failCurrentOrder(s,a,n,'COMPLIANT SUSPECT NOT AVAILABLE');return true;
      }
      if(n.interaction==='stop-escorting-suspect'&&!suspect.escortLeaderId){
        failCurrentOrder(s,a,n,'SUSPECT IS NOT FOLLOWING');return true;
      }
      const range=d(a.p,suspect.p);
      // Cheap explicit distance short-circuit precedes the shared verdict.
      if(range>SUSPECT_ESCORT_VOICE_RANGE||!assessTacticalAction({
        action:n.interaction,phase:'go',
        actorAvailable:true,targetAvailable:true,domainEligible:true,
        distance:range,maximumRange:SUSPECT_ESCORT_VOICE_RANGE,
        unobstructed:range<=SUSPECT_ESCORT_VOICE_RANGE&&
          sweptBodyClear(a.p,suspect.p,s.doors,1.5,sessionWorldGeometry(s))
      }).allowed){
        failCurrentOrder(s,a,n,'SUSPECT OUT OF VOICE RANGE');return true;
      }
      a.velocity=0;
      const bearing=Math.atan2(suspect.p.y-a.p.y,suspect.p.x-a.p.x);
      if(!rotate(a,bearing,dt,s))return true;
      a.actionTimer+=dt;
      if(a.actionTimer<.35)return true;
      const start=n.interaction==='escort-suspect';
      // A GO-time custody change belongs to the targeted original actor.
      // No civilian puppet, allegiance mutation, or implicit follow on arrest.
      suspect.escortLeaderId=start?a.id:null;
      suspect.lastEscortCommandAt=s.seconds;
      // A spoken command can interrupt an unrestrained escape preparation.
      // Once following, a poorly supervised suspect can still break away.
      if(start){
        suspect.suspectEscapeMode=null;
        suspect.suspectEscapeWeaponId=null;
        suspect.suspectEscapeGoal=null;
        suspect.suspectEscapeStartedAt=-100;
        suspect.suspectEscapeCooldownUntil=s.seconds+3;
      }
      suspect.escortGoal=null;
      suspect.lastEscortRouteAt=-100;
      suspect.nav=[];suspect.velocity=0;
      suspect.routeGoalKey='';
      const message=a.name+(start?' ESCORTING ':' STOPPED ESCORT OF ')+suspect.name;
      notify(s,message);
      battleEvent(s,'interaction',a,a.p,message,{
        action:start?'suspect-escort':'suspect-escort-stop',
        targetId:suspect.id,contributorId:a.id});
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='search-suspect'){
      const suspect=s.operators.find(x=>x.side==='red'&&
        n.objectId==='suspect:'+x.id);
      if(!suspect||suspect.health<=0||!suspect.surrendered||
         suspect.restrained!==true||suspect.suspectSearched===true||a.health<=0){
        failCurrentOrder(s,a,n,'RESTRAINED SUSPECT NOT AVAILABLE');return true;
      }
      const distance=d(a.p,suspect.p);
      const clear=sweptBodyClear(a.p,suspect.p,s.doors,5.5,
        sessionWorldGeometry(s));
      const contact=contactEpisode(s,a,n,suspect.p,'search-suspect',clear);
      if(contact.kind==='approach'){
        approach(a,contact.goal,dt,s,.65);return true;
      }
      if(contact.kind!=='ready'||!assessTacticalAction({
        action:'search-suspect',phase:'go',
        actorAvailable:true,targetAvailable:true,domainEligible:true,
        distance,maximumRange:28,unobstructed:clear
      }).allowed){
        failCurrentOrder(s,a,n,'SEARCH REQUIRES PHYSICAL CONTACT');return true;
      }
      a.velocity=0;
      if(!rotate(a,Math.atan2(suspect.p.y-a.p.y,suspect.p.x-a.p.x),dt,s))
        return true;
      if(!continueContact(a,dt,.9))return true;
      const pistol=suspect.equipment?.secondary;
      if(pistol?.weapon){
        // Physically confiscate only an actually issued carried pistol.
        s.droppedFirearms.push({
          id:s.nextEffectId++,ownerId:suspect.id,p:clone(suspect.p),
          heading:suspect.heading,at:s.seconds,weapon:suspect.weapon,
          loadedRounds:pistol.loadedRounds,reserveRounds:0,
          magazineId:'secondary:'+suspect.id,
          secondaryWeapon:pistol.weapon,status:'secured',securedById:a.id
        });
        suspect.equipment={...suspect.equipment!,secondary:undefined};
      }
      suspect.suspectSearched=true;
      const message=a.name+' SEARCHED '+suspect.name+
        (pistol?.weapon?' · SIDEARM SECURED':' · NO SIDEARM');
      notify(s,message);
      battleEvent(s,'interaction',a,a.p,message,{
        action:'suspect-searched',targetId:suspect.id,contributorId:a.id});
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='secure-firearm'){
      const weapon=s.droppedFirearms.find(w=>n.objectId==='weapon:'+w.id);
      if(!weapon||weapon.status!=='loose'||a.health<=0){
        failCurrentOrder(s,a,n,'DROPPED FIREARM UNAVAILABLE');return true;
      }
      const distance=d(a.p,weapon.p);
      const clear=sweptBodyClear(a.p,weapon.p,s.doors,1.5,
        sessionWorldGeometry(s));
      const contact=contactEpisode(s,a,n,weapon.p,'secure-firearm',clear);
      if(contact.kind==='approach'){
        approach(a,contact.goal,dt,s,.65);return true;
      }
      if(contact.kind!=='ready'||!assessTacticalAction({
        action:'secure-firearm',phase:'go',
        actorAvailable:true,targetAvailable:true,domainEligible:true,
        distance,maximumRange:34,unobstructed:clear
      }).allowed){
        failCurrentOrder(s,a,n,'NO REACHABLE WEAPON CONTACT');return true;
      }
      a.velocity=0;
      if(!rotate(a,Math.atan2(weapon.p.y-a.p.y,weapon.p.x-a.p.x),dt,s))
        return true;
      if(!continueContact(a,dt,.75))return true;
      weapon.status='secured';weapon.securedById=a.id;
      const message=a.name+' SECURED DROPPED FIREARM';
      notify(s,message);
      battleEvent(s,'interaction',a,a.p,message,{
        action:'weapon-secured',targetId:weapon.ownerId,
        objectId:'weapon:'+weapon.id,contributorId:a.id});
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='release-capture-target'){
      const target=s.operators.find(o=>o.id===n.objectId&&
        o.health<=0);
      if(!target||target.carriedById!==a.id||a.carryingId!==target.id){
        failCurrentOrder(s,a,n,'CAPTURE TARGET NOT IN TRANSPORT');return true;
      }
      // A stopped/replanned carrier releases the actual actor where the
      // previous resolved physical tick left it. No off-screen relocation.
      target.carriedById=null;target.transportMode=null;a.carryingId=null;
      a.transportLatched=false;
      a.velocity=0;
      const message=a.name+' RELEASED '+target.name;
      notify(s,message);
      battleEvent(s,'interaction',a,target.p,message,{
        action:'capture-target-released',targetId:target.id,contributorId:a.id});
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='release-civilian'){
      const person=s.civilians.find(c=>c.id===n.objectId);
      if(!person||!dropCivilianCustody(person,a)){
        failCurrentOrder(s,a,n,'CIVILIAN NOT IN CUSTODY');return true;
      }
      if(person.rescueTarget&&s.rescue){
        s.rescue.following=null;s.rescue.p=clone(person.p);
      }
      notify(s,'PERSON RELEASED — REASSIGN TO CONTINUE');
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.objectId.startsWith('civ:')&&
       (n.interaction==='secure-civilian'||
        n.interaction==='follow-civilian'||
        n.interaction==='stop-following-civilian'||
        n.interaction==='restrain-civilian')){
      const person=s.civilians.find(c=>c.id===n.objectId);
      // Spoken FOLLOW/STOP use actual voice reach and obstruction checks.
      // SECURE/RESTRAIN alone approach for physical hand contact.
      const voice=n.interaction==='follow-civilian'||
        n.interaction==='stop-following-civilian';
      const range=person?d(a.p,person.p):Infinity;
      const clear=!!person&&sweptBodyClear(a.p,person.p,s.doors,
        1.5,sessionWorldGeometry(s));
      const contact=!voice&&person&&person.health>0?
        contactEpisode(s,a,n,person.p,
          n.interaction==='restrain-civilian'?
          'restrain-civilian':'secure-civilian',clear,person.id):null;
      if(contact?.kind==='approach'){
        approach(a,contact.goal,dt,s,.65);return true;
      }
      const knownEscort=!!person?.following&&person.state==='escorted';
      const requireObserved=n.interaction==='follow-civilian'&&
        range>28&&!knownEscort;
      if(!person||person.health<=0||
         (!voice&&contact?.kind!=='ready')||
         range>(voice?CIVILIAN_VOICE_RANGE:PERSON_CONTACT_REACH)||
         !assessTacticalAction({
           action:n.interaction,phase:'go',
           actorAvailable:true,targetAvailable:true,domainEligible:true,
           requireObserved,
           observed:!requireObserved||liveVisibility(s,person.p),
           distance:range,
           maximumRange:voice?CIVILIAN_VOICE_RANGE:PERSON_CONTACT_REACH,
           unobstructed:clear
         }).allowed||
         (!voice&&person.rescueTarget&&!canSecureRescuePerson(person,a,
           (from,to)=>sweptBodyClear(from,to,s.doors,5.5,sessionWorldGeometry(s))))){
        failCurrentOrder(s,a,n,voice?
          'CIVILIAN OUT OF VOICE RANGE OR OBSTRUCTED':
          'CIVILIAN NOT IN PHYSICAL REACH');return true;
      }
      // Face the known person for either verbal instruction or close
      // hand contact. Both revalidate range and obstructions on GO.
      a.velocity=0;
      const bearing=Math.atan2(person.p.y-a.p.y,person.p.x-a.p.x);
      if(!rotate(a,bearing,dt,s))return true;
      // RESTRAIN is a universal operator ability. It remains a timed,
      // physically reached GO action, without optional loadout stock.
      if(n.interaction==='restrain-civilian'){
        if(person.state!=='compliant'||person.restrained===true||
           person.rescueTarget){
          failCurrentOrder(s,a,n,'RESTRAINT NOT AVAILABLE');return true;
        }
        if(a.actionTimer===0)a.lastCivilianContactAt=s.seconds;
        if(!continueContact(a,dt,RESTRAINT_CONTACT_SECONDS))return true;
        person.restrained=true;
        person.lastContactAt=s.seconds;person.lastContactPoint=clone(a.p);
        a.lastCivilianContactAt=s.seconds;
        notify(s,a.name+' RESTRAINED CIVILIAN');
        clearCurrentOrderIssue(a);pop(a);return true;
      }
      // Once face-to-face, complete at the authoritative contact. The
      // visible hand reach has its own short post-contact pose window:
      // already-aligned contacts keep their prior one-tick responsiveness.
      // Do not animate a hand touching someone 90 units away.
      if(!voice||range<=PERSON_CONTACT_REACH)a.lastCivilianContactAt=s.seconds;
      if(n.interaction==='stop-following-civilian'){
        if(!person.rescueTarget||s.missionType!=='rescue'||
           s.mission!=='extract'||!s.rescue||!knownEscort){
          failCurrentOrder(s,a,n,'PERSON IS NOT FOLLOWING');return true;
        }
        if(!setCivilianState(person,'compliant',s.seconds)){
          failCurrentOrder(s,a,n,'PERSON CANNOT STOP');return true;
        }
        person.following=null;person.goal=null;person.nav=[];
        person.lastEscortRouteAt=-100;
        s.rescue.following=null;s.rescue.p=clone(person.p);
        if(range<=28){
          person.lastContactAt=s.seconds;person.lastContactPoint=clone(a.p);
        }
        notify(s,'PERSON HOLDING POSITION — FOLLOW TO RESUME');
      }else if(n.interaction==='follow-civilian'){
        if(!person.rescueTarget||s.missionType!=='rescue'||
           s.mission!=='extract'||!s.rescue){
          failCurrentOrder(s,a,n,'ESCORT NOT AVAILABLE');return true;
        }
        if(!setCivilianState(person,'escorted',s.seconds)){
          failCurrentOrder(s,a,n,'PERSON CANNOT FOLLOW');return true;
        }
        person.following=a.id;
        s.rescue.following=a.id;s.rescue.p=clone(person.p);
        if(range<=28){
          person.lastContactAt=s.seconds;person.lastContactPoint=clone(a.p);
        }
        notify(s,a.name+' ESCORTING PERSON');
      }else{
        if(!setCivilianState(person,'compliant',s.seconds)){
          failCurrentOrder(s,a,n,'PERSON NEEDS ASSISTANCE');return true;
        }
        person.following=null;
        if(person.rescueTarget&&s.rescue)s.rescue.following=null;
        person.lastContactAt=s.seconds;person.lastContactPoint=clone(a.p);
        notify(s,a.name+' SECURED CIVILIAN');
      }
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    if(n.interaction==='power-on'||n.interaction==='power-off'){
      const control=s.site?powerControlAt(s.site,n.objectId):undefined;
      if(!control||a.health<=0||!s.sitePower||
         s.sitePower.mode!==s.lightingMode){
        failCurrentOrder(s,a,n,'POWER CONTROL UNAVAILABLE');return true;
      }
      // Wall fixtures are ~5 units in front of the real wall surface.
      // A narrow optical/contact sweep prevents through-wall use without
      // claiming the actor's full collision radius must enter the wall.
      if(controlPosition(a.p,control.p)>POWER_CONTROL_REACH||
         !sweptBodyClear(a.p,control.p,s.doors,1.5,sessionWorldGeometry(s))){
        failCurrentOrder(s,a,n,'POWER CONTROL OUT OF REACH');return true;
      }
      a.velocity=0;a.actionTimer+=dt;
      if(a.actionTimer<POWER_ACTION_SECONDS)return true;
      const desired=n.interaction==='power-on';
      const prior=control.kind==='breaker'?
        s.sitePower.circuits[control.circuit!]:
        s.sitePower.switches[control.fixtureId!];
      // Two people reaching the same control in one fixed tick resolve
      // in the existing stable actor order. Explicit SET requests never
      // accidentally flip a switch back on the second completion.
      const changed=control.kind==='breaker'?
        setSiteCircuitPower(s,control.circuit!,desired):
        setSiteFixtureSwitch(s,control.fixtureId!,desired);
      if(!changed&&prior!==desired){
        failCurrentOrder(s,a,n,'POWER CONTROL NO LONGER AVAILABLE');return true;
      }
      notify(s,a.name+' '+(desired?'RESTORED':'CUT')+' '+
        (control.kind==='breaker'?control.circuit!:control.roomId+' LIGHT'));
      battleEvent(s,'interaction',a,a.p,
        a.name+' '+(desired?'RESTORED':'CUT')+' POWER');
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    const [kind,id]=n.objectId.split(':');
    if(kind==='prop'&&n.interaction==='push'){
      let resolved=pushTargets.get(n);
      if(!resolved||resolved.token!==id||
         (s.coverState[resolved.index]?.id!==id&&
          String(resolved.index)!==id)){
        resolved={token:id,index:coverTargetIndex(s.coverState,id)};
        pushTargets.set(n,resolved);
      }
      const index=resolved.index,o=s.coverState[index];
      if(!o||!canRelocateCover(o)||d(a.p,{x:o.x,y:o.y})>
        Math.max(o.w,o.h)/2+43){
        failCurrentOrder(s,a,n,'OBJECT UNAVAILABLE');return true;
      }
      const dx=o.x-a.p.x,dy=o.y-a.p.y,
        length=Math.hypot(dx,dy)||1;
      const amount=coverPushDistance(o);
      const direction=n.pushDirection??{x:dx/length,y:dy/length};
      const mag=Math.hypot(direction.x,direction.y)||1;
      // Move the real collider a short swept increment per fixed tick.
      // Visuals, replay, firing cover and pathfinding see the same position.
      const duration=Math.max(.45,amount/28);
      const part=Math.max(0,Math.min(dt,duration-a.actionTimer));
      const distance=amount*part/duration;
      const pushed={x:o.x+direction.x/mag*distance,
        y:o.y+direction.y/mag*distance};
      if(part>.0001&&!movePhysicalProp(s,index,pushed)){
        failCurrentOrder(s,a,n,'OBJECT OBSTRUCTED');return true;
      }
      a.velocity=0;a.actionTimer+=dt;
      if(a.actionTimer<duration)return true;
      notify(s,a.name+' PUSHED '+(o.fixture??'OBJECT'));
    }else if(kind==='window'){
      // A pane cannot swing shut through somebody currently occupying the
      // opening. Preserve this CLOSE order until their landing completes.
      if(n.interaction==='close-window'&&s.operators.some(o=>o.health>0&&
         o.traversal?.windowId===id)){
        a.motorPause='window-clearance';a.velocity=0;a.actionTimer=0;return true;
      }
      const window=s.windows.find(w=>w.id===id);
      if(n.interaction==='break-window'){
        if(window?.shattered){clearCurrentOrderIssue(a);pop(a);return true;}
        if(!window||!windowCanBash(window)||!windowBashLaneClear(s,window,a.p)){
          failCurrentOrder(s,a,n,'GLASS NOT IN REACH');return true;
        }
        const point=windowBashPoint(window,a.p);
        a.velocity=0;
        if(!rotate(a,Math.atan2(point.y-a.p.y,point.x-a.p.x),dt,s))return true;
        if(a.actionTimer<=0){a.lastBashAt=s.seconds;a.lastBashRole='push';}
        a.fireCd=Math.max(a.fireCd,.55);
        a.aim=0;a.actionTimer+=dt;
        if(a.actionTimer<WINDOW_BASH_WINDUP)return true;
        if(!manipulateWindow(window,'break')){
          failCurrentOrder(s,a,n,'GLASS UNAVAILABLE');return true;
        }
        window.shatteredAt=s.seconds;
        s.objectRevision++;
        hear(s,point,170,'glass');
        notify(s,a.name+' BROKE GLASS');
        battleEvent(s,'impact',a,point,'GLASS SHATTERED',{action:'break-window',objectId:window.id});
        clearCurrentOrderIssue(a);pop(a);return true;
      }
      if(window&&
         (n.interaction==='open-window'&&window.open||
          n.interaction==='close-window'&&!window.open)){
        pop(a);return true; // Already in the state the player requested.
      }
      if(window&&d(a.p,{x:window.x,y:window.y})<54&&
         manipulateWindow(window,n.interaction==='open-window'?'open':'close')){
        s.objectRevision++;
        hear(s,{x:window.x,y:window.y},85,'window');
        notify(s,a.name+' MOVED WINDOW');
        battleEvent(s,'interaction',a,a.p,a.name+' MOVED WINDOW');
      }else{
        failCurrentOrder(s,a,n,'WINDOW UNAVAILABLE');return true;
      }
    }
    clearCurrentOrderIssue(a);pop(a);return true;
  }

 return false;
 };
}
