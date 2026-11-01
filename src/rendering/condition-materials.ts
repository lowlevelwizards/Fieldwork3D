/** Shared, bounded condition-dependent finish palette for physical fixtures.
 * Source materials retain pixel recipes and roughness; aging only changes tint.
 */
import type {PixelSurface} from './pixel-recipes.ts';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function ageMaterialColor(hex:number,surface:PixelSurface|undefined,
 level:number,variation=0):number{
 const t=Math.pow(clamp(level/100),1.3)*(.52+Math.max(-1,Math.min(1,variation))*.05);
 if(t<=0)return hex;
 const s=surface??'metal';
 const family=s.includes('wood')||s==='wood'?'wood':
  s.includes('metal')||s==='metal'||s.includes('steel')?'metal':
  s==='fabric'||s==='woven-fabric'||s==='carpet'?'fabric':
  s==='foliage'||s.includes('grass')?'foliage':
  s==='plastic'||s==='molded-plastic'||s==='rubber'?'plastic':
  s==='porcelain'||s==='tile'||s==='linoleum'?'ceramic':'stone';
 const target:Record<string,[number,number,number]>={
  wood:[83,72,53],metal:[88,84,69],fabric:[92,83,68],
  foliage:[76,79,51],plastic:[91,88,76],ceramic:[103,99,87],
  stone:[93,87,74],
 };
 const rgb=target[family];
 const a=(hex>>>16)&255,b=(hex>>>8)&255,c=hex&255;
 const mix=(start:number,to:number)=>Math.round(start*(1-t)+to*t);
 return (mix(a,rgb[0])<<16)|(mix(b,rgb[1])<<8)|mix(c,rgb[2]);
}
