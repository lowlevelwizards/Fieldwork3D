/** EQA3.16: one read-only, time-addressable civilian presentation contract.
 * Reads only recorded personal evidence, not the current enemy roster or
 * hidden tactical truth. Can be sampled at any time (including rewind).
 * No mesh, random draw, simulation mutation, or independent animation clock.
 */
import type {CivilianActor} from './breach-civilian-types.ts';
import {civilianPose} from './breach-civilian-pose.ts';

type Subject=Pick<CivilianActor,
 'p'|'heading'|'health'|'injuryStage'|'state'|'stateSince'|'velocity'|
 'activity'|'lastEvidenceAt'|'threatEstimate'|'lastFlinchAt'|'appearanceSeed'
> & Partial<Pick<CivilianActor,
 'lastEvidenceId'|'lastContactAt'|'lastContactPoint'|
 'carriedById'|'transportMode'|'restrained'>>;
const clamp=(v:number,low:number,high:number)=>Math.max(low,Math.min(high,v));
const ease=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const angle=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));

export type CivilianPhysicality={
 /** Existing pose compatibility is authoritative for skeleton/gait. */
 pose:ReturnType<typeof civilianPose>;
 /** Head-only evidence direction, absolute relative to authored body. */
 headYaw:number;
 /** 0..1 transient directly witnessed flinch, not new fear. */
 flinch:number;
 /** 0..1 blend for this actual state, reverse-time stable. */
 entering:number;
 /** 0..1 differentiates a cautious freeze from settled hiding. */
 shelter:number;
 /** Visual-only hand intent: does not imply custody. */
 hands:'none'|'up'|'head'|'behind';
 /** 0..1 compliance settling, never delays physical SECURE. */
 kneel:number;
};

export function civilianPhysicalityAt(c:Subject,now:number):CivilianPhysicality{
 const pose=civilianPose(c);
 const time=Number.isFinite(now)?now:0;
 const age=Number.isFinite(c.stateSince)?Math.max(0,time-c.stateSince):0;
 const entering=ease(age/.24);
 const immobile=pose==='down'||pose==='dragged'||pose==='carried';
 const secured=pose==='compliant'||pose==='restrained';
 const evidenceAge=time-c.lastEvidenceAt;
 const validEvidence=c.lastEvidenceAt>=0&&evidenceAge>=0&&
   evidenceAge<5.5&&!!c.threatEstimate&&
   Number.isFinite(c.threatEstimate.x)&&Number.isFinite(c.threatEstimate.y);
 // A GO-time physical touch authorizes a brief gaze to that exact
 // historic contact location. Never follow the current actor after GO.
 const contactAge=time-(c.lastContactAt??-100);
 const contact=contactAge>=0&&contactAge<1.4&&
   (pose==='compliant'||pose==='restrained'||pose==='walk'||pose==='idle')&&
   !!c.lastContactPoint&&
   Number.isFinite(c.lastContactPoint.x)&&
   Number.isFinite(c.lastContactPoint.y);
 const source=contact?c.lastContactPoint:validEvidence?c.threatEstimate:null;
 // Acoustics are estimates, not locked-on visual attention. Older films
 // missing an evidence ID receive the conservative audio limit.
 const visual=typeof c.lastEvidenceId==='string'&&
   c.lastEvidenceId.startsWith('visual/');
 const maxYaw=contact?.48:visual?.48:.28;
 const look=source&&!immobile&&(contact||!secured)?
   angle(Math.atan2(source.y-c.p.y,source.x-c.p.x)-c.heading):0;
 const attention=contact?
   ease(Math.min(1,contactAge/.12))*
    (1-ease((contactAge-.75)/.65)):
   validEvidence?
    ease(Math.min(1,evidenceAge/.16))*
    (1-ease((evidenceAge-(visual?3.5:2.1))/1.8)):0;
 const headYaw=clamp(look,-maxYaw,maxYaw)*.75*attention;
 const flinchAge=time-(c.lastFlinchAt??-100);
 const flinch=!immobile&&!secured&&flinchAge>=0&&flinchAge<.48?
   1-ease((flinchAge-.10)/.38):0;
 const shelter=pose==='hide'?c.state==='hiding'?
   .85*entering:.48*entering:0;
 const kneel=secured?ease((age-.32)/.92):0;
 const hands: CivilianPhysicality['hands']=immobile?'none':
   pose==='restrained'?'behind':
   flinch>.15||c.state==='hiding'||c.state==='frozen'||
     pose==='run'?'head':
   pose==='startled'||pose==='compliant'?'up':'none';
 return {pose,headYaw,flinch,entering,shelter,hands,kneel};
}
