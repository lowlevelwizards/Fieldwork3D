/** Seeded NPC identity, independent from weapon stats, faction art and
 * random draws consumed by the simulation. No extra decision clock. */
import type {EncounterRole,EncounterGroup} from './worldgen/encounter-types.ts';
export type AiCompetence='untrained'|'experienced'|'trained'|'specialist';
export type AiMotivation='survive'|'protect-assignment'|'support-group'|'avoid-capture';
export type NpcIdentity={competence:AiCompetence;motivation:AiMotivation;
 composure:number;discipline:number;curiosity:number;patience:number;loyalty:number};
const sample=(seed:number,id:string,channel:string)=>{
 let h=(2166136261^seed)>>>0;
 for(const ch of id+'/'+channel)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
 // Mix the final bits so adjacent actor names do not form obvious bands.
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;
 h=Math.imul(h,0x846ca68b);h^=h>>>16;
 return (h>>>0)/4294967296;
};
const tiers:AiCompetence[]=['untrained','experienced','trained','specialist'];
export function npcIdentity(seed:number,id:string,purpose?:EncounterGroup['purpose'],role?:EncounterRole):NpcIdentity{
 const roll=sample(seed,id,'competence');
 const rank=purpose==='organised'||purpose==='response'?
   (roll<.08?0:roll<.39?1:roll<.94?2:3):
   purpose==='security'?(roll<.15?0:roll<.65?1:roll<.98?2:3):
   (roll<.65?0:roll<.94?1:roll<.998?2:3);
 const trait=(key:string,base:number)=>Math.min(1,Math.max(0,base+(sample(seed,id,key)-.5)*.64));
 return {competence:tiers[rank],motivation:role==='target'||purpose==='target'?'avoid-capture':
   purpose==='security'?'protect-assignment':
   purpose==='organised'||purpose==='response'?'support-group':'survive',
   composure:trait('composure',.33+rank*.13),discipline:trait('discipline',.28+rank*.19),
   curiosity:trait('curiosity',.5),patience:trait('patience',.48+rank*.06),
   loyalty:trait('loyalty',purpose==='organised'||purpose==='response'?.68:purpose==='security'?.53:.35)};
}
