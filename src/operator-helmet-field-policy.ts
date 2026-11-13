/** H7: appearance-only field customization for ACH/MICH and PASGT.
 * Period PASGT keeps its own construction, with reference-gated addons.
 * All combinations are saved; unsupported equipment is suppressed at render,
 * not destructively removed from a saved look.
 */
export const FIELD_HELMETS=['ach','mich-2001','mich-2002','pasgt'] as const;
export type FieldHelmet=typeof FIELD_HELMETS[number];
export const HELMET_FIELD_COLORS=['auto','match','olive','tan','black'] as const;
export const HELMET_FIELD_CONCEALMENT=['none','foliage-loops','scrim','net','foliage-sparse','foliage-medium','foliage-heavy'] as const;
export const HELMET_FIELD_TILTS=['level','forward','rear'] as const;
export const HELMET_FIELD_GOGGLES=['none','eyes','front','rear'] as const;
export type HelmetFieldOptions={
 band:boolean;bandColor:typeof HELMET_FIELD_COLORS[number];
 webbingColor:typeof HELMET_FIELD_COLORS[number];
 concealment:typeof HELMET_FIELD_CONCEALMENT[number];
 fastened:boolean;tilt:typeof HELMET_FIELD_TILTS[number];
 shroud:boolean;rails:boolean;bungees:boolean;velcro:boolean;
 goggles:typeof HELMET_FIELD_GOGGLES[number];goggleSleeve:boolean;
 strobe:boolean;counterweight:boolean;battery:boolean;light:boolean;
 camera:boolean;chemlight:boolean;patches:boolean;
};
export const HELMET_FIELD_DEFAULTS:Readonly<HelmetFieldOptions>=Object.freeze({
 band:false,bandColor:'auto',webbingColor:'auto',concealment:'none',
 fastened:true,tilt:'level',shroud:false,rails:false,bungees:false,
 velcro:false,goggles:'none',goggleSleeve:false,
 strobe:false,counterweight:false,battery:false,light:false,camera:false,
 chemlight:false,patches:false
});
const choose=<T extends string>(v:unknown,values:readonly T[],fallback:T):T=>
 typeof v==='string'&&values.includes(v as T)?v as T:fallback;
export function readHelmetField(value:unknown):HelmetFieldOptions{
 const v=value&&typeof value==='object'&&!Array.isArray(value)?
  value as Record<string,unknown>:{};
 const d=HELMET_FIELD_DEFAULTS;
 const b=(k:keyof HelmetFieldOptions)=>typeof v[k]==='boolean'?v[k] as boolean:d[k] as boolean;
 return {
  band:b('band'),bandColor:choose(v.bandColor,HELMET_FIELD_COLORS,d.bandColor),
  webbingColor:choose(v.webbingColor,HELMET_FIELD_COLORS,d.webbingColor),
  concealment:choose(v.concealment,HELMET_FIELD_CONCEALMENT,d.concealment),
  fastened:b('fastened'),tilt:choose(v.tilt,HELMET_FIELD_TILTS,d.tilt),
  shroud:b('shroud'),rails:b('rails'),bungees:b('bungees'),
  velcro:b('velcro'),goggles:choose(v.goggles,HELMET_FIELD_GOGGLES,d.goggles),
  goggleSleeve:b('goggleSleeve'),strobe:b('strobe'),
  counterweight:b('counterweight'),battery:b('battery'),
  light:b('light'),camera:b('camera'),chemlight:b('chemlight'),patches:b('patches')
 };
}
export const isFieldHelmet=(id:string):id is FieldHelmet=>
 (FIELD_HELMETS as readonly string[]).includes(id);
/** Restrict the original PASGT to field-supported configurations.
 * Clip-on NVG brackets and goggles are period backed; ARC side rails,
 * helmet cameras, battery packs and dedicated modern counterweights are not
 * represented on the baseline PASGT. This is NOT a modernized PASGT mode.
 */
export function resolveHelmetField(id:string,raw:unknown):HelmetFieldOptions{
 const s=readHelmetField(raw);
 if(!isFieldHelmet(id))return {...HELMET_FIELD_DEFAULTS};
 if(id==='pasgt')return {...s,rails:false,bungees:false,velcro:false,
  counterweight:false,battery:false,camera:false,light:false};
 return s;
}
/** Fixed palette of historic webbing colors, with manual override. */
export const HELMET_FIELD_HEX={olive:0x586548,tan:0x977e59,black:0x262a29} as const;
export function resolveHelmetFieldColor(
 mode:HelmetFieldOptions['webbingColor'],shellHex:number,periodPasgt=false):number{
 if(mode==='match')return shellHex;
 if(mode==='olive'||mode==='tan'||mode==='black')return HELMET_FIELD_HEX[mode];
 if(periodPasgt)return HELMET_FIELD_HEX.olive;
 if(shellHex===0x000000||shellHex<0x303b43)return HELMET_FIELD_HEX.black;
 const r=(shellHex>>16)&255,g=(shellHex>>8)&255,b=shellHex&255;
 if(b>=r&&r<95&&g<95)return HELMET_FIELD_HEX.black;
 return r>g*1.13&&r>b*1.22?HELMET_FIELD_HEX.tan:HELMET_FIELD_HEX.olive;
}
