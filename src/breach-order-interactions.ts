import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 8: civilian custody/escort, physical prop pushing and window
 * actions. Target/reach checks are unchanged and failed orders remain.
 */
import {type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {setCivilianState} from './breach-civilian-types.ts';
import {quoteDeployedFieldUse,spendDeployedFieldItem}
 from './equipment-deployed-field-use.ts';
import {RESTRAINT_CONTACT_SECONDS} from './equipment-interaction-timings.ts';
import {dropCivilianCustody} from './breach-civilian-transport.ts';
import {canSecureRescuePerson} from './breach-civilian-mission.ts';
import {SUSPECT_CHALLENGE_RANGE,SUSPECT_CHALLENGE_SECONDS,
 challengeSuspectDecision,commitSuspectSurrender} from './breach-suspect-compliance.ts';
import {canRelocateCover,coverPushDistance} from './breach-movable-cover.ts';
import {coverTargetIndex} from './worldgen/site-object-identity.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {manipulateWindow} from './breach-windows.ts';
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
 return function executeInteractionOrder(s:Session,a:TeamActor,n:PlanNode,dt:number):boolean{
  if(n.kind==='interact'){
    if(!n.objectId||!n.interaction){
      failCurrentOrder(s,a,n,'INTERACTION TARGET UNAVAILABLE');return true;
    }
    const contactCommand=n.objectId.startsWith('civ:')&&
      (n.interaction==='secure-civilian'||
       n.interaction==='follow-civilian'||
       n.interaction==='restrain-civilian');
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
      if(!suspect||suspect.health<=0||a.health<=0||
         d(a.p,suspect.p)>SUSPECT_CHALLENGE_RANGE||
         !port.inSight(a,suspect,s)||
         !sweptBodyClear(a.p,suspect.p,s.doors,5.5,sessionWorldGeometry(s))){
        failCurrentOrder(s,a,n,'SUSPECT NOT VISIBLE OR IN SPEAKING RANGE');
        return true;
      }
      // Fixed GO-time voice duration. Revalidate physical sight on every
      // tick; no automatic surrender or unseen/through-wall effect.
      a.velocity=0;a.actionTimer+=dt;
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
        n.interaction==='restrain-civilian')){
      const person=s.civilians.find(c=>c.id===n.objectId);
      // This is a physically authored contact, not a remote command.
      // A person who shuffles a little while the squad approaches must
      // not make SECURE appear inert; close the remaining gap under the
      // usual motor/door/traffic authority, with a bounded pursuit range.
      const range=person?d(a.p,person.p):Infinity;
      const clear=!!person&&
        sweptBodyClear(a.p,person.p,s.doors,5.5,sessionWorldGeometry(s));
      if(person&&person.health>0&&range>28&&range<=45&&
         d(person.p,n.p)<=45&&clear&&
         (range<=32||liveVisibility(s,person.p))){
        // A civilian who shifts just past the operator stays a reachable
        // pending command. Walk the remaining real distance even when
        // the person has slipped behind the present sight cone.
        approach(a,person.p,dt,s,.65);return true;
      }
      if(!person||person.health<=0||range>28||!clear||
         (person.rescueTarget&&!canSecureRescuePerson(person,a,
           (from,to)=>sweptBodyClear(from,to,s.doors,5.5,sessionWorldGeometry(s))))){
        failCurrentOrder(s,a,n,'CIVILIAN NOT IN PHYSICAL REACH');return true;
      }
      // SECURE includes the obvious human movement: turn toward the
      // person actually in arm's reach, then make a short reassurance
      // gesture. In this close physical context, directional FOV alone
      // must not invalidate a legal contact. No remote or through-wall
      // interaction; GO rechecks live person position every tick.
      a.velocity=0;
      const bearing=Math.atan2(person.p.y-a.p.y,person.p.x-a.p.x);
      if(!rotate(a,bearing,dt,s))return true;
      // RESTRAIN is a separate physical job following SECURE. It cannot
      // manufacture cuffs, bind an uncooperative or rescue civilian, or
      // spend equipment while planning. Only a completed GO-time contact
      // removes one actually carried pair of flex cuffs.
      if(n.interaction==='restrain-civilian'){
        const cuffs=quoteDeployedFieldUse(a,'zip-tie');
        if(person.state!=='compliant'||person.restrained===true||
           person.rescueTarget||!cuffs.available){
          failCurrentOrder(s,a,n,'RESTRAINT NOT AVAILABLE');return true;
        }
        if(a.actionTimer===0)a.lastCivilianContactAt=s.seconds;
        a.actionTimer+=dt;
        if(a.actionTimer<RESTRAINT_CONTACT_SECONDS+cuffs.accessSeconds)return true;
        if(!spendDeployedFieldItem(a,'zip-tie')){
          failCurrentOrder(s,a,n,'RESTRAINT NOT AVAILABLE');return true;
        }
        person.restrained=true;
        // EQA3.16: successful real contact follows current inventory consumption.
        person.lastContactAt=s.seconds;person.lastContactPoint=clone(a.p);
        a.lastCivilianContactAt=s.seconds;
        notify(s,a.name+' RESTRAINED CIVILIAN · FLEX CUFFS '+a.restraintRemaining);
        clearCurrentOrderIssue(a);pop(a);return true;
      }
      // Once face-to-face, complete at the authoritative contact. The
      // visible hand reach has its own short post-contact pose window:
      // already-aligned contacts keep their prior one-tick responsiveness.
      a.lastCivilianContactAt=s.seconds;
      if(n.interaction==='follow-civilian'){
        if(!person.rescueTarget||s.missionType!=='rescue'||
           s.mission!=='extract'||!s.rescue){
          failCurrentOrder(s,a,n,'ESCORT NOT AVAILABLE');return true;
        }
        if(!setCivilianState(person,'escorted',s.seconds)){
          failCurrentOrder(s,a,n,'PERSON CANNOT FOLLOW');return true;
        }
        person.following=a.id;
        s.rescue.following=a.id;s.rescue.p=clone(person.p);
        person.lastContactAt=s.seconds;person.lastContactPoint=clone(a.p);
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
