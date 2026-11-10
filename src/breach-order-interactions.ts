/** Stage 8: civilian custody/escort, physical prop pushing and window
 * actions. Target/reach checks are unchanged and failed orders remain.
 */
import {type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {setCivilianState} from './breach-civilian-types.ts';
import {dropCivilianCustody} from './breach-civilian-transport.ts';
import {canSecureRescuePerson} from './breach-civilian-mission.ts';
import {canRelocateCover,coverPushDistance} from './breach-movable-cover.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {manipulateWindow} from './breach-windows.ts';
import {completeOrder,clearCurrentOrderIssue,
 failCurrentOrder as failOrder} from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const clone=(p:Pt):Pt=>({...p});
const pop=completeOrder;
export function createInteractionOrderHandler(port:OrderExecutionPort){
 const {approach,notify,battleEvent,liveVisibility,movePhysicalProp,hear}=port;
 const failCurrentOrder=(s:Session,a:TeamActor,n:PlanNode,reason:string)=>
  failOrder(s,a,n,reason,port.notify);
 return function executeInteractionOrder(s:Session,a:TeamActor,n:PlanNode,dt:number):boolean{
  if(n.kind==='interact'){
    if(!n.objectId||!n.interaction){
      failCurrentOrder(s,a,n,'INTERACTION TARGET UNAVAILABLE');return true;
    }
    if(!near(a.p,n.p,7)){
      approach(a,n.p,dt,s,.65);return true;
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
        n.interaction==='follow-civilian')){
      const person=s.civilians.find(c=>c.id===n.objectId);
      if(!person||person.health<=0||
         d(a.p,person.p)>32||
         !sweptBodyClear(a.p,person.p,s.doors,5.5)||
         (person.rescueTarget&&!canSecureRescuePerson(person,a,
           (from,to)=>sweptBodyClear(from,to,s.doors,5.5)))||
         !liveVisibility(s,person.p)){
        failCurrentOrder(s,a,n,'CIVILIAN NOT IN PHYSICAL REACH');return true;
      }
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
        notify(s,a.name+' ESCORTING PERSON');
      }else{
        if(!setCivilianState(person,'compliant',s.seconds)){
          failCurrentOrder(s,a,n,'PERSON NEEDS ASSISTANCE');return true;
        }
        person.following=null;
        if(person.rescueTarget&&s.rescue)s.rescue.following=null;
        notify(s,a.name+' SECURED CIVILIAN');
      }
      clearCurrentOrderIssue(a);pop(a);return true;
    }
    const [kind,id]=n.objectId.split(':');
    if(kind==='prop'&&n.interaction==='push'){
      const index=Number(id),o=s.coverState[index];
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
