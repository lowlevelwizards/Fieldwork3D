/** Eyewear R3-4. Headwear brow clearances, never global arbitrary scaling.
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
export function fittedEyeOffset(headwear:string,top:number):EyewearFit{
 const h=COVER[headwear];
 if(!h||headwear==='bare')return {y:0,z:0,brow:Infinity,clearance:0};
 const clearance=.18;
 return {
  y:Math.max(-.92,Math.min(0,h.brow-clearance-top)),
  z:h.advance,brow:h.brow,clearance
 };
}
