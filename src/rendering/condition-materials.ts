/** F3.3 bounded, material-aware age tint for physical fixtures.
 * Keeps original paint/wood/cloth colors authoritative; decorative only.
 * Room-scale exposure, dirt placement and decals remain separate systems.
 */
import type {PixelSurface} from './pixel-recipes.ts';
import {surfaceVisualRole,type VisualMaterialRole} from './material-identity.ts';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const targets:Readonly<Record<VisualMaterialRole,readonly [number,number,number]>>={
 steel:[82,88,84],polymer:[84,86,79],wood:[90,74,54],
 fabric:[96,88,74],armor:[88,91,79],paint:[94,91,81],
 mineral:[96,96,87],ceramic:[110,108,99],
 organic:[78,82,60],neutral:[93,87,75]
};
/** Different substrates collect discoloration differently; no universal
 * dark-brown multiplier. Do not alter real geometry, material textures or
 * ballistics by referencing this presentation-only policy.
 */
const weathering:Readonly<Record<VisualMaterialRole,number>>={
 steel:.95,polymer:.76,wood:1.08,fabric:.88,armor:.79,
 paint:.87,mineral:1.06,ceramic:.61,organic:1.10,neutral:.75
};
export function ageMaterialColor(hex:number,surface:PixelSurface|undefined,
 level:number,variation=0):number{
 const role=surfaceVisualRole(surface??'metal');
 const t=clamp(Math.pow(clamp(level/100),1.3)*
  (.52+Math.max(-1,Math.min(1,variation))*.05)*weathering[role]);
 if(t<=0)return hex;
 const rgb=targets[role];
 const a=(hex>>>16)&255,b=(hex>>>8)&255,c=hex&255;
 const mix=(start:number,to:number)=>Math.round(start*(1-t)+to*t);
 return (mix(a,rgb[0])<<16)|(mix(b,rgb[1])<<8)|mix(c,rgb[2]);
}
