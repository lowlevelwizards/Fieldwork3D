/** H15 · One Studio ballistic helmet item, three proven MICH/ACH shell cuts.
 * Legacy models remain valid for importing older looks and other callers;
 * only these three share the fully developed ACH/MICH field equipment.
 * Pure mapping — no renderer construction or per-frame cut simulation.
 */
export const BALLISTIC_HELMET_CUTS=['full','mid','high'] as const;
export type BallisticHelmetCut=typeof BALLISTIC_HELMET_CUTS[number];

export const BALLISTIC_CUT_SHELL:Readonly<Record<BallisticHelmetCut,
 'ach'|'mich-2002'|'mich-2001'>>={
 full:'ach',mid:'mich-2002',high:'mich-2001'
};
const LEGACY_CUTS:Readonly<Record<string,BallisticHelmetCut>>={
 'ach':'full','mich-2002':'mid','mich-2001':'high',
 'fast-xp-mid':'mid','fast-sf':'high',
 'high-cut':'high','high-cut-rails':'high'
};
export const ballisticHelmetCut=(id:unknown):BallisticHelmetCut|null=>
 typeof id==='string'?LEGACY_CUTS[id]??null:null;
export const isBallisticHelmet=(id:unknown):boolean=>
 ballisticHelmetCut(id)!==null;
export const canonicalBallisticHelmet=(id:string):string=>{
 const cut=ballisticHelmetCut(id);
 return cut?BALLISTIC_CUT_SHELL[cut]:id;
};
export const isLegacyBallisticHelmet=(id:string):boolean=>
 ballisticHelmetCut(id)!==null&&canonicalBallisticHelmet(id)!==id;
