/** FT1.3C deterministic proposals. Research facts never become rarity weights. */
import {historicalEquipmentEligibility,type HistoricalGenerationContext,
 type EligibleHistoricalItem} from './faction-reference-equipment-eligibility.ts';
import {gameMappingForHistorical,type HistoricalGameMapping}
 from './faction-reference-game-mapping.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';

export type GenerationMode='evidence-backed'|'playable-composite';
export type HistoricalChoice={
 historicalId:string;recordId:string;sourceIds:readonly string[];
 name:string;category:string;confidence:'supported'|'tentative';
 mapping:HistoricalGameMapping|null;notes:readonly string[];
};
export type HistoricalKitConflict={category:string;alternatives:readonly HistoricalChoice[]};
export type HistoricalLoadoutProposal={
 version:1;context:HistoricalGenerationContext;mode:GenerationMode;seed:number;
 status:'partial'|'proposable'|'no-evidence'|'invalid-context';
 choices:readonly HistoricalChoice[];conflicts:readonly HistoricalKitConflict[];
 unresolvedCategories:readonly string[];retainedSlots:readonly string[];
 warnings:readonly string[];
 /** Research supports individual pieces, NOT their combination as a complete kit. */
 completeKitVerified:false;
};
export type GenerationOptions={
 context:HistoricalGenerationContext;mode:GenerationMode;seed?:number;
 lockedCategories?:readonly string[];
 selectedHistoricalIds?:Readonly<Record<string,string>>;
 baseline?:EquipmentLoadout;
};
const CATEGORIES=['uniform','headwear','armor','weapon','carriage'] as const;
const rank=(choice:HistoricalChoice)=>
 (choice.mapping?.playable===true?0:100)+
 (choice.confidence==='supported'?0:20)+
 (choice.mapping?.fidelity==='exact'?0:choice.mapping?.fidelity==='representative'?2:10);
const hash=(seed:number,value:string)=>{
 let n=(seed>>>0)^2166136261;
 for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);
 return n>>>0;
};
const choiceOf=(item:EligibleHistoricalItem):HistoricalChoice=>({
 historicalId:item.equipment.id,recordId:item.record.id,
 sourceIds:[...item.record.evidenceIds],name:item.equipment.name,
 category:item.equipment.category,confidence:item.certainty,
 mapping:gameMappingForHistorical(item.equipment),
 notes:[item.record.note,...item.warnings]
});
export function generateHistoricalLoadout(options:GenerationOptions):HistoricalLoadoutProposal{
 const {context,mode}=options;
 const seed=Number.isSafeInteger(options.seed)?(options.seed!>>>0):0;
 const report=historicalEquipmentEligibility(context);
 const choices:HistoricalChoice[]=[],conflicts:HistoricalKitConflict[]=[];
 const unresolvedCategories:string[]=[],retainedSlots:string[]=[];
 for(const category of CATEGORIES){
  const candidates=report.items.filter(x=>x.equipment.category===category)
   .map(choiceOf).sort((a,b)=>a.historicalId.localeCompare(b.historicalId)||
    a.recordId.localeCompare(b.recordId));
  if(!candidates.length){
   unresolvedCategories.push(category);
   if(mode==='playable-composite'&&options.baseline)
    retainedSlots.push(category);
   continue;
  }
  if(options.lockedCategories?.includes(category)){
   unresolvedCategories.push(category);
   if(options.baseline)retainedSlots.push(category);
   continue;
  }
  const preferred=options.selectedHistoricalIds?.[category];
  let selected=preferred?candidates.find(c=>c.historicalId===preferred):undefined;
  if(!selected){
   const best=Math.min(...candidates.map(rank));
   const equals=candidates.filter(c=>rank(c)===best);
   selected=equals[hash(seed,context.timelineId+':'+context.year+':'+category)%equals.length];
  }
  if(candidates.length>1)conflicts.push({category,alternatives:candidates});
  choices.push(selected);
  if(!selected.mapping?.playable){
   unresolvedCategories.push(category);
   if(mode==='playable-composite'&&options.baseline)retainedSlots.push(category);
  }
 }
 const status=report.status==='invalid-context'?'invalid-context':
  report.status==='no-evidence'?'no-evidence':
  unresolvedCategories.length?'partial':'proposable';
 return {version:1,context:{...context},mode,seed,status,
  choices,conflicts,unresolvedCategories,retainedSlots,
  warnings:[
   ...report.warnings,
   ...(choices.some(x=>x.mapping?.fidelity==='proxy')?
    ['A visual proxy is not historically correct equipment']:[]),
   ...(report.excluded.some(x=>x.reason.includes('theater-specific'))?
    ['Theater-limited records require an explicit matching theater']:[]),
   'Individual evidence does not verify this as a complete historical kit'
  ],completeKitVerified:false};
}
