/** SR10 — relaxed wrist targets from existing deterministic gait phase.
 * No new locomotion clock and no simulation changes. */
import {retentionGaitPhase} from './operator-retention-cadence.ts';
import {neutralMannequinWrist} from './operator-mannequin-pose.ts';
import type {EquipmentExterior} from './operator-equipment-exterior.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
export type RetentionLocomotion=Readonly<{
 stride:number;speed:number;posture?:'stand'|'crouch';
 gait?:'walk'|'run'|'pie'|'squeeze';injury?:number;direction?:number;
}>;
const finite=(v:number|undefined)=>Number.isFinite(v)?v!:0;
const unit=(v:number)=>Math.max(0,Math.min(1,v));
export function sampleRetentionFreeWrist(side:-1|1,mode:RetentionPoseMode,
 motion?:RetentionLocomotion,exterior?:EquipmentExterior){
 const wrist=neutralMannequinWrist(side);
 const speed=unit(finite(motion?.speed)/65);
 const crouch=motion?.posture==='crouch';
 const careful=motion?.gait==='pie'||motion?.gait==='squeeze';
 const phase=retentionGaitPhase(finite(motion?.stride))+(side===1?Math.PI:0);
 const carryingSide=mode==='side-slung'&&side===1;
 const amp=(motion?.gait==='run'?4.2:3.1)*speed*
  (crouch?.62:1)*(careful?.45:1)*(carryingSide?.40:1)*
  (finite(motion?.injury)>=2?.65:1);
 const swing=Math.sin(phase)*amp;
 const direction=motion?.direction??0;
 wrist.x+=swing*Math.cos(direction)+(crouch?2.25:0);
 wrist.y+=swing*swing/(Math.max(1,amp))*.22+(crouch?2.1:0)+(motion?.gait==='run'?speed*.8:0);
 const surface=exterior?Math.abs(exterior.side(-7,wrist.x,side)):7;
 wrist.z=side*(Math.max(Math.abs(wrist.z),surface+1.55)+
  (carryingSide?1.1:0)+Math.abs(swing*Math.sin(direction))*.22);
 return wrist;
}
