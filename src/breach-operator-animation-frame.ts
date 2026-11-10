/** Roadmap 2 Stage 11: render-only operator animation frame lifecycle.
 * Single source of scratch allocation, replay discontinuity handling, and
 * baseline chest/head yaw smoothing. Never writes game simulation state.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {createOperatorPoseScratch,type OperatorPoseScratch}
 from './breach-operator-pose-scratch.ts';

const scratchByRig=new WeakMap<OperatorRig,OperatorPoseScratch>();
const turnByRig=new WeakMap<OperatorRig,{chest:number;head:number}>();
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const diff=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const approach=(v:number,target:number,rate:number,dt:number)=>
 v+clamp(diff(v,target),-rate*dt,rate*dt);

/** Restores handoff visibility for replay seeks and gathers reusable scratch. */
export function beginOperatorAnimationFrame(
 r:OperatorRig,p:OperatorPose,dt:number){
 const previouslyHiddenV4=r.root.userData.reloadV4HiddenSource as
    THREE.Mesh|undefined;
 if(previouslyHiddenV4)previouslyHiddenV4.visible=true;
 r.root.userData.reloadV4HiddenSource=null;
 let scratch=scratchByRig.get(r);
 if(!scratch){
  scratch=createOperatorPoseScratch();
  scratchByRig.set(r,scratch);
 }
 const discontinuity=dt<0||r.lastTime>p.seconds+.03||
  p.seconds-r.lastTime>1.2;
 if(discontinuity)r.lastTime=p.seconds;
 return {scratch,discontinuity,dt:clamp(discontinuity?0:dt,0,.08)};
}

/** Applied before procedural idle sway/aim offsets; never read the final
 * Euler angles as the next frame's baseline. Deterministic replay resets.
 */
export function sampleOperatorTurnAngles(r:OperatorRig,p:OperatorPose,
 turn:{chestYaw:number;headYaw:number},dt:number,discontinuity:boolean){
 let turns=turnByRig.get(r);
 if(!turns){
  turns={chest:turn.chestYaw,head:turn.headYaw};
  turnByRig.set(r,turns);
 }
 if(p.deterministic||discontinuity||!r.lastPose){
  turns.chest=turn.chestYaw;
  turns.head=turn.headYaw;
 }else{
  turns.chest=approach(turns.chest,turn.chestYaw,
    p.aiming?7.5:5.8,dt);
  turns.head=approach(turns.head,turn.headYaw,10.0,dt);
 }
 return turns;
}
