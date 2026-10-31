/** Authored silhouette intent. These targets are resolved by the shared
 * two-handed physical fit, not directly applied as bone rotations.
 * +pitch raises the muzzle; back retracts stock in operator local +X. */
import type {Handling} from './breach-weapon-pose.ts';
import type {WeaponId} from './breach-combat.ts';
export type HandlingProfile={
  pitch:number;stockY:number;preferredBack:number;
  torsoLean:number;torsoTurn:number;headPitch:number;
  headDrop:number;shoulderLift:number;pelvisShift:number;
  elbowTuck:number;stanceCompression:number;
};
export const HANDLING_PROFILES:Record<Handling,HandlingProfile>={
  low:{pitch:-.48,stockY:3.0,preferredBack:1.6,
    torsoLean:0,torsoTurn:-.012,headPitch:0,headDrop:0,
    shoulderLift:-.42,pelvisShift:0,elbowTuck:.46,stanceCompression:0},
  high:{pitch:.55,stockY:5.6,preferredBack:1.3,
    torsoLean:-.025,torsoTurn:.045,headPitch:0,headDrop:0,
    shoulderLift:.60,pelvisShift:.10,elbowTuck:.64,stanceCompression:.12},
  ready:{pitch:-.11,stockY:4.5,preferredBack:1.8,
    torsoLean:.012,torsoTurn:0,headPitch:0,headDrop:0,
    shoulderLift:-.06,pelvisShift:0,elbowTuck:.48,stanceCompression:0},
  short:{pitch:-.025,stockY:-2.0,preferredBack:6.1,
    torsoLean:.050,torsoTurn:-.10,headPitch:0,headDrop:0,
    shoulderLift:.10,pelvisShift:.25,elbowTuck:.76,stanceCompression:.32},
  point:{pitch:.012,stockY:5.3,preferredBack:0,
    torsoLean:.055,torsoTurn:.025,headPitch:-.01,headDrop:.12,
    shoulderLift:.18,pelvisShift:.20,elbowTuck:.35,stanceCompression:.40},
  ads:{pitch:0,stockY:7.5,preferredBack:-.4,
    torsoLean:.065,torsoTurn:0,headPitch:-.15,headDrop:1.35,
    shoulderLift:.46,pelvisShift:.27,elbowTuck:.29,stanceCompression:.48},
};
export function handlingProfile(mode:Handling,weapon:WeaponId):HandlingProfile{
  const base=HANDLING_PROFILES[mode];
  // Long weapons demand slightly more shoulder clearance and reduced
  // projection in a tucked stance; SMGs naturally remain compact.
  const length=weapon==='rifle'?1.19:weapon==='shotgun'?1.08:
    weapon==='smg'?.72:1;
  return {...base,preferredBack:base.preferredBack+
    (mode==='short'?(length-1)*2:0)};
}
