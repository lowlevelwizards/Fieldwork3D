/** Material-legal, usage-aware wear effects for actual interior substrates.
 * Keeps oil around machinery, grease near cooking, and water/mineral rings
 * in wet rooms. Never puts rust on carpet or textile fraying on ceramic tile.
 */
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
import {materialProperties,canWear} from './material-properties.ts';
import type {WearKind} from './environment-wear.ts';
const FALLBACK:Record<string,readonly WearKind[]>={
 steel:['rust','scratch','scuff'],wood:['scratch','chip','stain'],
 mineral:['stain','crack','scuff'],ceramic:['mineral','stain','scuff'],
 textile:['stain','fray','scuff'],plastic:['scuff','fade','stain'],
 organic:['mud','footprint','abrade']
};
const activities:Record<string,readonly WearKind[]>={
 cooking:['grease','soot','stain','scuff'],
 wet:['mineral','drip','stain','scuff'],
 industrial:['oil','rust','scratch','scuff'],
 traffic:['mud','footprint','scuff','scratch'],
 private:['scratch','stain','scuff','fade']
};
export type WearActivity=keyof typeof activities;
export function materialWearKind(surface:PixelSurface,preferred:WearKind,
 activity:WearActivity='private',selection=0):WearKind{
 if(canWear(surface,preferred))return preferred;
 const p=materialProperties(surface);
 const choices=[...(activities[activity]??[]),...FALLBACK[p.substrate]]
   .filter((kind,index,array)=>array.indexOf(kind)===index&&canWear(surface,kind));
 return choices.length?choices[Math.floor(Math.max(0,Math.min(.999999,selection))*choices.length)]:'scuff';
}
