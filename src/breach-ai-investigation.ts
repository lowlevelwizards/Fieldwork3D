/** Grounded investigation timing. Personalities only change tempo
 * and risk tolerance; they never improve the knowledge available to AI. */
import {AI_EXPERIENCE} from './breach-ai-group-profiles.ts';
import type {NpcIdentity} from './breach-ai-identity.ts';
export type InvestigationPersonality='guard'|'aggressor'|'cautious';
export type InvestigationTempo={
 orientSeconds:number;inspectSeconds:number;approachScale:number;
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function investigationTempo(personality:InvestigationPersonality,
 uncertainty=65,identity?:NpcIdentity):InvestigationTempo{
 const uncertaintyDelay=clamp(uncertainty,0,240)/240*.18;
 const base=personality==='aggressor'?{orientSeconds:.22+uncertaintyDelay*.4,inspectSeconds:.26,approachScale:1.10}:
   personality==='cautious'?{orientSeconds:.74+uncertaintyDelay,inspectSeconds:.72,approachScale:.70}:
   {orientSeconds:.43+uncertaintyDelay*.7,inspectSeconds:.46,approachScale:.82};
 if(!identity)return base;
 // Human variation in assessment and inspection, never awareness or aim.
 const experience=AI_EXPERIENCE[identity.competence];
 return {...base,orientSeconds:base.orientSeconds*(1.20-.40*identity.composure)*experience.orientation,
   inspectSeconds:base.inspectSeconds*(.80+.40*identity.patience)*experience.inspection};
}

/** Investigations cannot cling forever to a physically blocked candidate.
 * This only controls where to search next; the motor still validates travel. */
export function stalledInvestigationAction(
 blockedSeconds:number,remainingCandidates:number):
 'continue'|'inspect-next'|'stand-down'{
 if(blockedSeconds<2.7)return 'continue';
 return remainingCandidates>0?'inspect-next':'stand-down';
}
