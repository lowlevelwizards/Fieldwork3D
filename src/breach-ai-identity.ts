/** Seeded NPC identity, independent from weapon stats, faction art and
 * random draws consumed by the simulation. No extra decision clock. */
import type {EncounterRole,EncounterGroup,EncounterPremise} from './worldgen/encounter-types.ts';
import {soundResponse,type SoundResponse} from './breach-sound-evidence.ts';
export type AiCompetence='untrained'|'experienced'|'trained'|'specialist';
export type AiMotivation='survive'|'protect-assignment'|'support-group'|'avoid-capture';
export type AiGroupKind='opportunists'|'organised-criminals'|'armed-irregulars'|'security'|'regular-force'|'specialists'|'fugitives';
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
const tiers:AiCompetence[]=['untrained','experienced','trained','specialist'];
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
 const cutoffs:Record<AiGroupKind,[number,number,number]>={
  opportunists:[.65,.94,.998],fugitives:[.55,.90,.99],
  'organised-criminals':[.08,.39,.94],'armed-irregulars':[.12,.55,.96],
  security:[.15,.65,.98],'regular-force':[.03,.23,.94],specialists:[.01,.10,.60]
 };
 const [a,b,c]=cutoffs[groupKind];
 const rank=competenceOverride?Math.max(0,tiers.indexOf(competenceOverride)):
  roll<a?0:roll<b?1:roll<c?2:3;
 const collective=['organised-criminals','armed-irregulars','regular-force','specialists'].includes(groupKind);
 const trait=(key:string,base:number)=>Math.min(1,Math.max(0,base+(sample(seed,id,key)-.5)*.64));
 return {competence:tiers[rank],groupKind,motivation:role==='target'||groupKind==='fugitives'?'avoid-capture':
   groupKind==='security'?'protect-assignment':collective?'support-group':'survive',
   composure:trait('composure',.33+rank*.13),discipline:trait('discipline',.28+rank*.19),
   curiosity:trait('curiosity',.5),patience:trait('patience',.48+rank*.06),
   loyalty:trait('loyalty',collective?.68:groupKind==='security'?.53:.35)};
}
/** Personality only changes response to ambiguous routine sounds, never
 * recognition, geometry or urgent violent-event response. */
export function npcSoundResponse(kind:string,intensity:number,identity?:NpcIdentity):SoundResponse{
 const baseline=soundResponse(kind,intensity);
 if(identity&&baseline==='investigate'&&intensity<.60&&
    ['footstep','door','furniture','window'].includes(kind)&&identity.curiosity<.32)return 'orient';
 return baseline;
}
