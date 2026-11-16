/** FT1.4B: system-only composition audit. Two independently cited items
 * do NOT prove they were worn together. No new kit, item or historical claims.
 */
import type {HistoricalChoice} from './faction-reference-loadout-generator.ts';
export type HistoricalEnsembleAssessment={
 evidenceClass:'independently-sourced-composite';
 documentedWholeKit:false;
 researchedCategoryCount:number;
 visuallyRepresentedCount:number;
 proxyOnlyCount:number;
 historicalOnlyCount:number;
 sourceCount:number;
 /** Inferred from actual compatible game target slots, not fictional issue. */
 visualSlotConflicts:readonly {slot:string;historicalIds:readonly string[]}[];
 warnings:readonly string[];
};
export function assessHistoricalEnsemble(
 choices:readonly HistoricalChoice[]):HistoricalEnsembleAssessment{
 const slots=new Map<string,Set<string>>();
 let visuallyRepresentedCount=0,proxyOnlyCount=0,historicalOnlyCount=0;
 const sources=new Set<string>();
 for(const choice of choices){
  for(const id of choice.sourceIds)sources.add(id);
  const model=choice.mapping;
  if(!model){historicalOnlyCount++;continue;}
  if(!model.playable||model.fidelity==='proxy')proxyOnlyCount++;
  else visuallyRepresentedCount++;
  const target=model.gameSlot??model.wardrobeSlot??model.channel;
  const values=slots.get(target)??new Set<string>();
  values.add(choice.historicalId);slots.set(target,values);
 }
 const visualSlotConflicts=[...slots.entries()]
  .filter(([,ids])=>ids.size>1)
  .map(([slot,ids])=>({slot,historicalIds:[...ids].sort()}))
  .sort((a,b)=>a.slot.localeCompare(b.slot));
 return {evidenceClass:'independently-sourced-composite',
  documentedWholeKit:false,
  researchedCategoryCount:new Set(choices.map(c=>c.category)).size,
  visuallyRepresentedCount,proxyOnlyCount,historicalOnlyCount,
  sourceCount:sources.size,visualSlotConflicts,
  warnings:[
   'Individually sourced equipment does not establish a co-issued historical set',
   ...(visualSlotConflicts.length?
    ['Several historical choices target the same game slot; resolve them before issue']:[])
  ]};
}
