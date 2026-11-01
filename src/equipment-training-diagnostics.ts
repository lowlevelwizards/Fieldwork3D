/** Build 25.01: truth-only live training diagnostics.
 * These values are sampled from the live fixed-step actor, not synthetic
 * UI scores or another shooting simulation.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {resolveWeaponAssembly,initialWeaponConfiguration} from './equipment-weapon-assemblies.ts';
const pct=(n:number)=>Math.round(Math.max(0,Math.min(1,n))*100);
export type RangeDiagnostic={
 operator:string;weapon:string;shots:number;magazine:number;
 reserve:number;aim:number;recoil:number;stability:number;
 mode:string;injury:number;
};
export function rangeDiagnostic(actor:TeamActor):RangeDiagnostic{
 return {operator:actor.name,weapon:actor.weapon.toUpperCase(),
  shots:actor.shots,magazine:actor.magazine,reserve:actor.reserve,
  aim:pct(actor.aim),recoil:pct(actor.recoil),
  stability:pct(actor.stability),mode:actor.firePolicy.toUpperCase(),
  injury:actor.injuryStage};
}
export function activeRangeDiagnostic(s:Session,id:string):RangeDiagnostic|null{
 if(!s.site?.training)return null;
 const actor=s.operators.find(o=>o.id===id&&o.side==='blue');
 return actor?rangeDiagnostic(actor):null;
}
export function rangeDiagnosticLabel(v:RangeDiagnostic):string{
 return 'EQUIPMENT RANGE · '+v.operator.toUpperCase()+' / '+v.weapon+
  ' · FIRED '+v.shots+' · MAG '+v.magazine+' / RES '+v.reserve+
  ' · AIM '+v.aim+'% · RECOIL '+v.recoil+'% · STABILITY '+
  v.stability+'% · '+v.mode;
}

/** A past trial is one immutable, volatile comparison record. No localStorage,
 * campaign settlement, RNG or extra weapon state is involved.
 */
export type RangeTrial={
 operator:string;weapon:string;configuration:string;massKg:number;
 shots:number;durationSeconds:number;magazine:number;reserve:number;
};
export function captureRangeTrial(s:Session,id:string):RangeTrial|null{
 if(!s.site?.training)return null;
 const actor=s.operators.find(o=>o.id===id&&o.side==='blue');
 if(!actor)return null;
 const config=actor.weaponConfiguration??initialWeaponConfiguration(actor.weapon);
 const resolved=resolveWeaponAssembly(config);
 return {operator:actor.name,weapon:actor.weapon.toUpperCase(),
  configuration:Object.values(config.slots).join(' / '),
  massKg:resolved.massKg,shots:actor.shots,
  durationSeconds:Math.round(s.seconds*10)/10,
  magazine:actor.magazine,reserve:actor.reserve};
}
export function rangeTrialLabel(t:RangeTrial):string{
 return 'PREVIOUS TRIAL · '+t.weapon+' '+t.massKg.toFixed(2)+'kg'+
  ' · FIRED '+t.shots+' · TIME '+t.durationSeconds.toFixed(1)+'s';
}
