import {sessionWorldGeometry} from './breach-world-context.ts';
/** Roadmap 2 Stage 7: narrow authoritative motor coordinator.
 * Called only from breach-game's fixed 60 Hz session step. It owns no
 * global clock, doesn't change authored orders, and never touches rendering.
 */
import {OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
import {canSmoothMotorCorner} from './breach-motor-cornering.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {releaseEmbeddedMotorActor} from './breach-locomotion-clearance.ts';
import {sampleActorMotorStride} from './breach-actor-motor-stride.ts';
import {advanceMotorTraversal,prepareMotorTraversal}
 from './breach-motor-traversal.ts';
import {prepareMotorRoute} from './breach-motor-route.ts';
import {negotiateMotorPassage} from './breach-motor-passage.ts';
import {handleMotorDoor} from './breach-motor-door.ts';
import {resolveMotorCollision} from './breach-motor-collision.ts';
import {d,angle,type ActorMotorHooks} from './breach-motor-contract.ts';

export function advanceActorMotor(
 a:TeamActor,p:Pt,dt:number,s:Session,hooks:ActorMotorHooks,
 speedScale=1):boolean{
 // Do not interrupt a continuous physical traversal with route search.
 if(advanceMotorTraversal(a,s,dt,hooks))return true;
 if(releaseEmbeddedMotorActor(a,p,s.doors,dt,sessionWorldGeometry(s)))return true;
 if(prepareMotorTraversal(a,p,dt,s,hooks))return true;

 const readiness=prepareMotorRoute(a,p,dt,s,hooks);
 if(readiness==='handled')return true;
 if(readiness==='unavailable')return false;

 // Tiny grid bends may be redundant once the full shoulder can take a
 // lawful chord. Only transient motor nodes may be skipped. The next
 // position still comes from the ordinary velocity/physical motor.
 if(a.nav.length>=2&&canSmoothMotorCorner(a.p,a.nav[0],a.nav[1],
   a.side==='blue'&&a.plan[0]?.kind==='move'&&
   !a.plan[0]?.entryDoorId&&a.blockedTime<.2&&
   !a.squeeze&&!a.traversal&&!a.traversalPending&&
   !a.autoSidestep&&!a.aimInstruction&&
   !approachingNarrowThreshold(a.p,p,s.doors),
   (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,
     sessionWorldGeometry(s))))a.nav.shift();
 const next=a.nav[0],gap=d(a.p,next);
 if(gap<3){a.nav.shift();return false;}
 const direction=angle(a.p,next);
 const {canAutoSidestep,move:initialMove}=sampleActorMotorStride(
   a,s,p,direction,dt,gap,speedScale);

 const passage=negotiateMotorPassage(a,p,initialMove,dt,s,hooks);
 if(passage.paused)return true;

 const door=handleMotorDoor(a,p,next,passage.move,dt,s,hooks);
 if(door.paused)return true;

 return resolveMotorCollision(a,p,next,passage.move,dt,s,
   canAutoSidestep,door.closed,hooks);
}
