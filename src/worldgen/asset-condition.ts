import type {PixelSurface} from '../rendering/pixel-recipes.ts';
export type PreviewCondition='clean'|'used'|'neglected'|'vacant';
const ceramic=new Set<PixelSurface>(['porcelain','tile','plastic','molded-plastic']);
const textile=new Set<PixelSurface>(['fabric','woven-fabric','carpet']);
export function conditionColor(hex:number,surface:PixelSurface,state:PreviewCondition):number{
 if(state==='clean')return hex;
 const strength=(state==='used'?.07:state==='vacant'?.21:.14)*(ceramic.has(surface)?.43:1);
 const target=ceramic.has(surface)?[173,167,154]:textile.has(surface)?[138,129,118]:[109,105,91];
 const rgb=[(hex>>16)&255,(hex>>8)&255,hex&255].map((v,i)=>
   Math.max(0,Math.min(255,Math.round(v*(1-strength)+target[i]*strength))));
 return (rgb[0]<<16)|(rgb[1]<<8)|rgb[2];
}
export function conditionRoughness(rough:number|undefined,surface:PixelSurface,state:PreviewCondition):number{
 const start=rough??.82;
 return state==='clean'?start:Math.min(1,start+(state==='used'?.015:.055)*(ceramic.has(surface)?.3:1));
}
