/** Seeded NPC identity, independent from weapon stats, faction art and
 * random draws consumed by the simulation. No extra decision clock. */
import type {EncounterRole,EncounterGroup,EncounterPremise} from './worldgen/encounter-types.ts';
import {soundResponse,type SoundResponse} from './breach-sound-evidence.ts';
import {AI_COMPETENCE,AI_GROUP_PROFILES,type AiCompetence,type AiGroupKind,type AiMotivation} from './breach-ai-group-profiles.ts';
export type {AiCompetence,AiGroupKind,AiMotivation} from './breach-ai-group-profiles.ts';
export type NpcIdentity={competence:AiCompetence;motivation:AiMotivation;groupKind:AiGroupKind;
 composure:number;discipline:number;curiosity:number;patience:number;loyalty:number};
const sample=(seed:number,id:string,channel:string)=>{
 let h=(2166136261^seed)>>>0;
 for(const ch of id+'/'+channel)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
 // Mix the final bits so adjacent actor names do not form obvious bands.
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;
 h=Math.imul(h,0x846ca68b);h^=h>>>16;
 return (h>>>0)/4294967296;
};
export function npcGroupKind(purpose?:EncounterGroup['purpose'],premise?:EncounterPremise,
 explicit?:AiGroupKind):AiGroupKind{
 if(explicit)return explicit;
 if(purpose==='target')return 'fugitives';
 if(purpose==='response')return 'specialists';
 if(purpose==='security')return 'security';
 if(purpose==='organised')return premise==='defensive'?'armed-irregulars':'organised-criminals';
 return 'opportunists';
}
export function npcIdentity(seed:number,id:string,purpose?:EncounterGroup['purpose'],role?:EncounterRole,
 premise?:EncounterPremise,explicit?:AiGroupKind,competenceOverride?:AiCompetence):NpcIdentity{
 const groupKind=npcGroupKind(purpose,premise,explicit);
 const roll=sample(seed,id,'competence');
 const profile=AI_GROUP_PROFILES[groupKind];
 const [a,b,c]=profile.competenceCutoffs;
 const rank=competenceOverride?Math.max(0,AI_COMPETENCE.indexOf(competenceOverride)):
  roll<a?0:roll<b?1:roll<c?2:3;
 const trait=(key:string,base:number)=>Math.min(1,Math.max(0,base+(sample(seed,id,key)-.5)*.64));
 return {competence:AI_COMPETENCE[rank],groupKind,motivation:role==='target'?'avoid-capture':profile.motivation,
   composure:trait('composure',.33+rank*.13),discipline:trait('discipline',.28+rank*.19),
   curiosity:trait('curiosity',.5),patience:trait('patience',.48+rank*.06),
   loyalty:trait('loyalty',profile.loyalty)};
}
/** Personality only changes response to ambiguous routine sounds, never
 * recognition, geometry or urgent violent-event response. */
export function npcSoundResponse(kind:string,intensity:number,identity?:NpcIdentity):SoundResponse{
 const baseline=soundResponse(kind,intensity);
 if(identity&&baseline==='investigate'&&intensity<.60&&
    ['footstep','door','furniture','window'].includes(kind)&&identity.curiosity<.32)return 'orient';
 return baseline;
}
