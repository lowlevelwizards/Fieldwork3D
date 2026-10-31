/** Authored silhouette intent. The firearm still owns the physical contact
 * transform; the rig consumes these shared parameters for head/torso/shoulder
 * and separate left support/right firing arm targets.
 * +pitch raises the muzzle. +elbowFlare moves a bend slightly outboard.
 */
import type {Handling} from './breach-weapon-pose.ts';
import type {WeaponId} from './breach-combat.ts';
export type HandlingProfile={
  pitch:number;stockY:number;preferredBack:number;
  torsoLean:number;torsoTurn:number;headPitch:number;
  headDrop:number;shoulderLift:number;pelvisShift:number;
  elbowTuck:number;stanceCompression:number;
  supportElbowFlare:number;firingElbowFlare:number;
  supportShoulderForward:number;firingShoulderForward:number;
  shoulderInward:number;
};
export const HANDLING_PROFILES:Record<Handling,HandlingProfile>={
  low:{pitch:-.48,stockY:3.0,preferredBack:1.6,
    torsoLean:0,torsoTurn:-.012,headPitch:0,headDrop:0,
    shoulderLift:-.42,pelvisShift:0,elbowTuck:.42,stanceCompression:0,
    supportElbowFlare:.47,firingElbowFlare:.65,
    supportShoulderForward:.14,firingShoulderForward:.04,
    shoulderInward:.08},
  high:{pitch:.55,stockY:5.6,preferredBack:1.3,
    torsoLean:-.025,torsoTurn:.045,headPitch:0,headDrop:0,
    shoulderLift:.60,pelvisShift:.10,elbowTuck:.57,stanceCompression:.12,
    supportElbowFlare:.39,firingElbowFlare:.54,
    supportShoulderForward:.06,firingShoulderForward:-.10,
    shoulderInward:.18},
  ready:{pitch:-.11,stockY:4.5,preferredBack:1.8,
    torsoLean:.016,torsoTurn:.014,headPitch:0,headDrop:0,
    shoulderLift:-.06,pelvisShift:0,elbowTuck:.42,stanceCompression:0,
    supportElbowFlare:.56,firingElbowFlare:.72,
    supportShoulderForward:.22,firingShoulderForward:.12,
    shoulderInward:.10},
  short:{pitch:-.025,stockY:-2.0,preferredBack:6.1,
    torsoLean:.050,torsoTurn:-.10,headPitch:0,headDrop:0,
    shoulderLift:.10,pelvisShift:.25,elbowTuck:.68,stanceCompression:.32,
    supportElbowFlare:.40,firingElbowFlare:.64,
    supportShoulderForward:.20,firingShoulderForward:-.25,
    shoulderInward:.24},
  point:{pitch:.012,stockY:5.3,preferredBack:0,
    torsoLean:.058,torsoTurn:.025,headPitch:-.005,headDrop:.10,
    shoulderLift:.23,pelvisShift:.20,elbowTuck:.30,stanceCompression:.40,
    supportElbowFlare:.62,firingElbowFlare:.80,
    supportShoulderForward:.60,firingShoulderForward:.40,
    shoulderInward:.08},
  ads:{pitch:0,stockY:7.5,preferredBack:-.4,
    torsoLean:.078,torsoTurn:.012,headPitch:-.09,headDrop:.87,
    shoulderLift:.57,pelvisShift:.27,elbowTuck:.24,stanceCompression:.48,
    supportElbowFlare:.70,firingElbowFlare:.82,
    supportShoulderForward:.68,firingShoulderForward:.53,
    shoulderInward:.15},
};
export function handlingProfile(mode:Handling,weapon:WeaponId):HandlingProfile{
  const base=HANDLING_PROFILES[mode];
  const length=weapon==='rifle'?1.19:weapon==='shotgun'?1.08:
    weapon==='smg'?.72:1;
  return {...base,preferredBack:base.preferredBack+
    (mode==='short'?(length-1)*2:0)};
}
