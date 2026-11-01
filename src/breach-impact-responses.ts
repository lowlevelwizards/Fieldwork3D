/** Material effects attach to simulation hit events, never guess paint. */
import {MATERIALS,type MaterialId} from './breach-materials.ts';
export type ImpactAudio='glass'|'splinter'|'spark'|'chip'|'thud';
export type MaterialResponse={visual:'glass'|'wood'|'metal'|'stone'|'dust';
 sound:ImpactAudio;radius:number;debris:number};
export function materialResponse(material:MaterialId):MaterialResponse{
 const visual=MATERIALS[material].impact;
 if(material==='glass')return {visual:'glass',sound:'glass',radius:175,debris:7};
 if(visual==='metal')return {visual:'metal',sound:'spark',radius:130,debris:4};
 if(visual==='wood')return {visual:'wood',sound:'splinter',radius:105,debris:4};
 if(visual==='stone')return {visual:'stone',sound:'chip',radius:120,debris:5};
 return {visual:'dust',sound:'thud',radius:65,debris:2};
}
