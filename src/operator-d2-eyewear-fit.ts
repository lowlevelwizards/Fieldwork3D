/** Eyewear R6. Headwear brow clearances, never global arbitrary scaling.
 * Based on the same real silhouette metrics used to construct each helmet.
 */
import {HEAD_SILHOUETTE_METRICS} from './operator-headwear-silhouettes.ts';
const COVER:Readonly<Record<string,{brow:number;advance:number}>>={
 ...Object.fromEntries(Object.values(HEAD_SILHOUETTE_METRICS).map(m=>[
  m.id,{brow:m.foreheadEdge,advance:m.billLength>0?-.12:-.30}
 ])),
 'baseball-cap':{brow:4.64,advance:-.12},
 'backwards-cap':{brow:4.64,advance:-.08},
 'field-cap':{brow:4.64,advance:-.12},
 'skate-helmet':{brow:4.45,advance:-.30},
 'bump-helmet':{brow:4.45,advance:-.30}
};
export type EyewearFit={y:number;z:number;brow:number;clearance:number};
/** Model-aware cap/helmet fit. Executed during wardrobe updates only. */
export function fittedEyeOffset(
 headwear:string,top:number,eyewearId:string=''
):EyewearFit{
 const h=COVER[headwear];
 if(!h||headwear==='bare')return {y:0,z:0,brow:Infinity,clearance:0};
 const isBrimmedCap=['patrol-cap','baseball-cap','backwards-cap','field-cap'].includes(headwear);
 const clearance=eyewearId==='goggles-low'&&isBrimmedCap?0.14:0.18;
 const needed=Math.max(0,top-(h.brow-clearance));
 // Tall field-goggle brow needs a little more downward room than
 // spectacles. Stop before moving the lens entirely below the eyes.
 // When an especially low helmet brow still conflicts, shift the goggle
 // forward a small additional amount, instead of hiding its upper roof.
 const maximumDown=eyewearId==='goggles-low'?1.00:top>5.15?1.16:.92;
 const down=Math.min(needed,maximumDown);
 const remaining=Math.max(0,needed-down);
 return {
  y:-down,
  z:h.advance-(remaining>.03?.15:0),
  brow:h.brow,clearance
 };
}
