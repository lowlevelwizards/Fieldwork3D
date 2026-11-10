/** Fixed-tick actor intent phase, between belief aging and shared motion.
 * This is not a scheduler, an independent clock or a presentation animator.
 * Enemy policy and player orders still arrive through the typed game port.
 */
import {type Pt,OPERATOR_RADIUS} from './breach-core.ts';
import {length,targetAngle,angleDifference} from './breach-plan.ts';
import {witnessShock,countNearbyEnemyAllies,moraleResponse} from './breach-ai-morale.ts';
import {wallSafeFall} from './breach-ground-geometry.ts';
import {passageIdleYieldStep,type PassageActor} from './breach-passage.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {incomingHitFacing} from './breach-combat-reactions.ts';
import {rotate} from './breach-order-lifecycle.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {Session,TeamActor} from './breach-game.ts';
const d=length,angle=targetAngle;
const clone=(p:Pt):Pt=>({...p});
export type ActorSimulationPhasePort={
 notify:(s:Session,message:string)=>void;
 battleEvent:(s:Session,kind:BattleEvent['kind'],actor:TeamActor|null,
   p:Pt,text:string,meta?:BattleEvent['meta'])=>void;
 unobstructed:(from:Pt,to:Pt,s:Session,lowBlocks:boolean)=>boolean;
 defensivePosition:(a:TeamActor,threat:Pt,s:Session)=>Pt|null;
 decideEnemy:(s:Session,a:TeamActor,h:number)=>void;
 runFriendly:(s:Session,a:TeamActor,h:number)=>void;
};
export function advanceSimulationActors(s:Session,h:number,
 port:ActorSimulationPhasePort,markActor?:(id:string)=>void):void{
 const {notify,battleEvent,unobstructed}=port;
  for(const a of s.operators){
    if(a.health<=0&&a.reload>0){a.reload=0;a.reloadMode=null;}
    a.fireCd=Math.max(0,a.fireCd-h);
    if(a.side==='red'&&a.health>0){
      a.morale=Math.min(1,a.morale+h*.006-
        (a.suppression>.65?h*.075:0));
      // Only a visible nearby casualty affects this actor's resolve.
      for(const fallen of s.operators){
        if(fallen===a||fallen.side!==a.side||fallen.health>0||
           fallen.surrendered||fallen.lastDownAt<=a.lastMoraleEventAt)continue;
        const distance=d(a.p,fallen.p);
        const visible=distance<160&&
          Math.abs(angleDifference(a.heading,angle(a.p,fallen.p)))<1.25&&
          unobstructed(a.p,fallen.p,s,false);
        const shock=witnessShock(distance,visible);
        if(shock>0){
          a.morale=Math.max(0,a.morale-shock);
          a.lastMoraleEventAt=Math.max(a.lastMoraleEventAt,fallen.lastDownAt);
        }
      }
      // Nearby members of the same encounter group can steady resolve.
      // Do not pay an extra ally scan every tick for calm defenders.
      const peerSupport=(a.suppression>.25||a.morale<.65)?
        countNearbyEnemyAllies(a,s.operators):0;
      const resolve=moraleResponse(a.morale,a.suppression,
        a.injuryStage,a.personality,{nearbyAllies:peerSupport});
      if(resolve==='withdraw'&&a.alert!=='retreat'){
        const threat=a.contact??a.heard??a.watch;
        if(threat){
          a.retreatPoint=port.defensivePosition(a,threat,s);
          if(a.retreatPoint){a.alert='retreat';a.nav=[];}
        }
      }
      if(resolve==='surrender'){
        a.surrendered=true;a.health=0;a.injuryStage=3;
        a.lastDownAt=s.seconds;
        const fall=wallSafeFall(a.p,a.heading,'slump',sessionWorldGeometry(s).walls);
        a.downPose=fall.pose;a.downClearance=fall.space;
        a.velocity=0;a.nav=[];a.plan=[];
        a.reload=0;a.reloadMode=null;
        notify(s,a.name+' SURRENDERED');
        battleEvent(s,'surrender',a,a.p,a.name+' SURRENDERED');
      }
    }
    a.suppression=Math.max(0,a.suppression-h*.17);
    a.priorP=clone(a.p);
    if(a.health<=0)continue;
    if((a.doorStunUntil??0)>s.seconds){
      // Retain authored orders; no movement or firing while physically stunned.
      a.velocity=0;a.motorPause='contact';
      continue;
    }
    if(a.side==='blue'){
      port.runFriendly(s,a,h);
      // A teammate with NO authored orders shouldn't permanently plug an
      // otherwise usable threshold. Give the idle soldier a genuine small,
      // collision-checked step away from an approaching friendly. Keep
      // explicit WAIT, WATCH, STACK and authored positions untouched.
      if(!a.plan.length&&!a.nav.length&&!a.traversal&&
         !a.traversalPending&&!a.aimInstruction&&!a.carryingId){
        const nearby=s.operators.filter(b=>b!==a&&b.side==='blue'&&
          b.health>0&&b.plan[0]?.kind==='move'&&
          d(a.p,b.p)<75);
        if(nearby.length){
          const idle:PassageActor={
            id:a.id,side:a.side,p:a.p,goal:null,
            health:a.health,blockedTime:a.blockedTime,active:false
          };
          const peers:PassageActor[]=nearby.map(b=>({
            id:b.id,side:b.side,p:b.p,
            goal:b.nav.at(-1)??b.plan[0]!.p,health:b.health,
            blockedTime:b.blockedTime,active:true
          }));
          const yieldStep=passageIdleYieldStep(idle,s.doors,peers,
            (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s)),h*45);
          if(yieldStep&&!s.operators.some(b=>b!==a&&b.health>0&&
              d(b.p,yieldStep)<13&&d(b.p,yieldStep)<d(b.p,a.p)-.01)){
            a.p=yieldStep;a.velocity=d(a.priorP,a.p)/Math.max(h,.0001);
            a.motorPause='passage';
          }
        }
      }
      // Incoming *actual hits* provide coarse directional evidence even
      // before the flanking shooter enters the operator's vision cone.
      // A brief gaze override never removes a WATCH or changes a MOVE.
      const hitDirection=incomingHitFacing(a.heading,a.lastHitYaw,
        s.seconds-a.lastHitAt,{
          busy:!!a.traversal||!!a.squeeze||!!a.carryingId||
            a.pace==='run'||a.treatmentActive||
            a.plan[0]?.kind==='treat'
        });
      // Orders may rotate toward their authored gaze earlier this tick.
      // Reaction uses a stronger one-second turn so opposing turn rates
      // cannot cancel each other and leave the operator facing away.
      if(hitDirection!==null)rotate(a,hitDirection,h*1.85);
    }else port.decideEnemy(s,a,h);
    if(markActor)markActor(a.id);
  }
}
