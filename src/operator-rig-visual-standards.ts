/** RIG-R3 visual proportions in the actual +X-forward chest coordinate frame.
 * Mass uses the R5 12%-wider webbing pass for game-distance legibility;
 * inventory, armor protection, collisions and magazine capacity never change.
 */
export type RigVisualBudget={web:number;shoulder:number;flank:number;projection:number};
export const RIG_VISUAL_BUDGET:Readonly<Record<string,RigVisualBudget>>={
 'chest-placard':{web:1.05,shoulder:1.41,flank:1.12,projection:.19},
 'micro-rig':{web:1.21,shoulder:1.62,flank:1.23,projection:.23},
 'light-rig':{web:1.30,shoulder:1.84,flank:1.43,projection:.30},
 'chicom-rig':{web:1.21,shoulder:1.62,flank:1.32,projection:.28},
 'bandolier':{web:1.43,shoulder:1.77,flank:1.30,projection:.32},
 'split-front':{web:1.34,shoulder:1.90,flank:1.55,projection:.30},
 'full-chest':{web:1.43,shoulder:2.07,flank:1.62,projection:.35},
 'lbv':{web:1.46,shoulder:2.07,flank:1.68,projection:.32},
 'field-webbing':{web:1.40,shoulder:1.90,flank:1.59,projection:.30},
 'belt-harness':{web:1.48,shoulder:1.93,flank:1.62,projection:.30},
 'sadf-webbing':{web:1.50,shoulder:2.13,flank:1.70,projection:.36}
};
const FALLBACK:RigVisualBudget={web:1.23,shoulder:1.70,flank:1.34,projection:.24};
export const rigVisualBudget=(style:string):RigVisualBudget=>
 RIG_VISUAL_BUDGET[style]??FALLBACK;
