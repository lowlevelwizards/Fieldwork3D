/** RIG-R3 visual proportions in the actual +X-forward chest coordinate frame.
 * Mass is intentionally larger than real webbing for game-distance legibility;
 * inventory, armor protection, collisions and magazine capacity never change.
 */
export type RigVisualBudget={web:number;shoulder:number;flank:number;projection:number};
export const RIG_VISUAL_BUDGET:Readonly<Record<string,RigVisualBudget>>={
 'chest-placard':{web:.94,shoulder:1.26,flank:1.00,projection:.19},
 'micro-rig':{web:1.08,shoulder:1.45,flank:1.10,projection:.23},
 'light-rig':{web:1.16,shoulder:1.64,flank:1.28,projection:.30},
 'chicom-rig':{web:1.08,shoulder:1.45,flank:1.18,projection:.28},
 'bandolier':{web:1.28,shoulder:1.58,flank:1.16,projection:.32},
 'split-front':{web:1.20,shoulder:1.70,flank:1.38,projection:.30},
 'full-chest':{web:1.28,shoulder:1.85,flank:1.45,projection:.35},
 'lbv':{web:1.30,shoulder:1.85,flank:1.50,projection:.32},
 'field-webbing':{web:1.25,shoulder:1.70,flank:1.42,projection:.30},
 'belt-harness':{web:1.32,shoulder:1.72,flank:1.45,projection:.30},
 'sadf-webbing':{web:1.34,shoulder:1.90,flank:1.52,projection:.36}
};
const FALLBACK:RigVisualBudget={web:1.10,shoulder:1.52,flank:1.20,projection:.24};
export const rigVisualBudget=(style:string):RigVisualBudget=>
 RIG_VISUAL_BUDGET[style]??FALLBACK;
