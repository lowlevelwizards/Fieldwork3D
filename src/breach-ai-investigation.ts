/** Grounded investigation timing. Personalities only change tempo
 * and risk tolerance; they never improve the knowledge available to AI. */
export type InvestigationPersonality='guard'|'aggressor'|'cautious';
export type InvestigationTempo={
 orientSeconds:number;inspectSeconds:number;approachScale:number;
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function investigationTempo(personality:InvestigationPersonality,
 uncertainty=65):InvestigationTempo{
 const uncertaintyDelay=clamp(uncertainty,0,240)/240*.18;
 if(personality==='aggressor')
   return {orientSeconds:.22+uncertaintyDelay*.4,
     inspectSeconds:.26,approachScale:1.10};
 if(personality==='cautious')
   return {orientSeconds:.74+uncertaintyDelay,
     inspectSeconds:.72,approachScale:.70};
 return {orientSeconds:.43+uncertaintyDelay*.7,
   inspectSeconds:.46,approachScale:.82};
}
