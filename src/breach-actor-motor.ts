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
 speedScale=1,profile?:((section:string,elapsedMs:number)=>void)):boolean{
 // All marks are observational and gated behind the same opt-in simulation
 // profiler as the parent operator total. No additional work in normal play.
 const traversalStart=profile?performance.now():0;
 // Do not interrupt a continuous physical traversal with route search.
 if(advanceMotorTraversal(a,s,dt,hooks)){
  if(profile)profile('motor-traversal',performance.now()-traversalStart);
  return true;
 }
 if(releaseEmbeddedMotorActor(a,p,s.doors,dt,sessionWorldGeometry(s))){
  if(profile)profile('motor-traversal',performance.now()-traversalStart);
  return true;
 }
 if(prepareMotorTraversal(a,p,dt,s,hooks)){
  if(profile)profile('motor-traversal',performance.now()-traversalStart);
  return true;
 }
 if(profile)profile('motor-traversal',performance.now()-traversalStart);

 const routeStart=profile?performance.now():0;
 const readiness=prepareMotorRoute(a,p,dt,s,hooks);
 if(profile)profile('motor-route',performance.now()-routeStart);
 if(readiness==='handled')return true;
 if(readiness==='unavailable')return false;

 const strideStart=profile?performance.now():0;
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
 if(gap<3){
  a.nav.shift();
  if(profile)profile('motor-stride',performance.now()-strideStart);
  return false;
 }
 const direction=angle(a.p,next);
 const {canAutoSidestep,move:initialMove}=sampleActorMotorStride(
   a,s,p,direction,dt,gap,speedScale);
 if(profile)profile('motor-stride',performance.now()-strideStart);

 const passageStart=profile?performance.now():0;
 const passage=negotiateMotorPassage(a,p,initialMove,dt,s,hooks);
 if(profile)profile('motor-passage',performance.now()-passageStart);
 if(passage.paused)return true;

 const doorStart=profile?performance.now():0;
 const door=handleMotorDoor(a,p,next,passage.move,dt,s,hooks);
 if(profile)profile('motor-door',performance.now()-doorStart);
 if(door.paused)return true;

 const collisionStart=profile?performance.now():0;
 const resolved=resolveMotorCollision(a,p,next,passage.move,dt,s,
   canAutoSidestep,door.closed,hooks);
 if(profile)profile('motor-collision',performance.now()-collisionStart);
 return resolved;
}
