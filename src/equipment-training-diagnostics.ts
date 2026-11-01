/** Build 25.01: truth-only live training diagnostics.
 * These values are sampled from the live fixed-step actor, not synthetic
 * UI scores or another shooting simulation.
 */
import type {Session,TeamActor} from './breach-game.ts';
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
