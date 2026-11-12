/** Encounter social group purpose, not appearance/faction skin, determines
 * trained-versus-irregular tendencies. No extra runtime decision scheduler. */
import type {EncounterRole,EncounterGroup} from './worldgen/encounter-types.ts';
export type EncounterDoctrine='irregular'|'security'|'organised';
export type Temperament='guard'|'aggressor'|'cautious';
export function doctrineForPurpose(purpose:EncounterGroup['purpose']|undefined):
 EncounterDoctrine{
 return purpose==='organised'?'organised':
   purpose==='security'?'security':'irregular';
}
export function doctrinePersonality(doctrine:EncounterDoctrine,
 role:EncounterRole|undefined,roll:number):Temperament{
 if(role==='investigator')return 'aggressor';
 if(role==='reserve'||role==='target')return 'cautious';
 const r=Math.max(0,Math.min(.999999,roll));
 if(doctrine==='organised')
  return r<.12?'aggressor':r<.66?'guard':'cautious';
 if(doctrine==='security')
  return r<.64?'guard':r<.89?'cautious':'aggressor';
 return (['guard','aggressor','cautious'] as const)[Math.floor(r*3)];
}
export function doctrineInitialMorale(doctrine:EncounterDoctrine,
 roll:number):number{
 const r=Math.max(0,Math.min(1,roll));
 return doctrine==='organised'?.60+r*.38:
   doctrine==='security'?.53+r*.45:.45+r*.53;
}
