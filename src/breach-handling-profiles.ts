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
  low:{pitch:-.43,stockY:2.8,preferredBack:1.6,
    torsoLean:0,torsoTurn:-.012,headPitch:0,headDrop:0,
    shoulderLift:-.55,pelvisShift:0,elbowTuck:.68,stanceCompression:0},
  high:{pitch:.60,stockY:5.9,preferredBack:1.4,
    torsoLean:-.018,torsoTurn:.02,headPitch:-.015,headDrop:0,
    shoulderLift:.75,pelvisShift:.12,elbowTuck:.9,stanceCompression:.12},
  ready:{pitch:-.11,stockY:4.6,preferredBack:1.8,
    torsoLean:.012,torsoTurn:0,headPitch:0,headDrop:0,
    shoulderLift:0,pelvisShift:0,elbowTuck:.68,stanceCompression:0},
  short:{pitch:-.08,stockY:-2.6,preferredBack:6.8,
    torsoLean:.035,torsoTurn:-.12,headPitch:0,headDrop:0,
    shoulderLift:.22,pelvisShift:.35,elbowTuck:1,stanceCompression:.32},
  point:{pitch:.015,stockY:5.5,preferredBack:0,
    torsoLean:.055,torsoTurn:.025,headPitch:-.01,headDrop:.2,
    shoulderLift:.28,pelvisShift:.26,elbowTuck:.48,stanceCompression:.40},
  ads:{pitch:0,stockY:7.7,preferredBack:-.4,
    torsoLean:.065,torsoTurn:0,headPitch:-.13,headDrop:1.25,
    shoulderLift:.52,pelvisShift:.30,elbowTuck:.38,stanceCompression:.48},
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
