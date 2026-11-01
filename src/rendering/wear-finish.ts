/** Restrained light response for wear layers; no physically false glossy rust. */
import type {PixelSurface} from './pixel-recipes.ts';
import type {WearEffect} from '../worldgen/material-properties.ts';
import {materialProperties,wearSubstrateColor} from '../worldgen/material-properties.ts';
export function wearFinish(surface:PixelSurface,effect:WearEffect){
 const p=materialProperties(surface);
 const wet=['oil','grease','puddle'].includes(effect);
 const metallic=effect==='chip'&&p.substrate==='steel';
 const roughness=wet?.32:effect==='rust'||effect==='moss'?.98:
   effect==='scratch'?.55:Math.min(1,p.roughness+.06);
 const metalness=metallic?.45:0;
 const color=effect==='chip'?wearSubstrateColor(surface):
  effect==='oil'||effect==='grease'?0x343a34:
  effect==='rust'?0x9b5936:effect==='moss'?0x52694a:
  effect==='mineral'?0xd6d3c5:0x9c9789;
 return {roughness,metalness,color};
}
