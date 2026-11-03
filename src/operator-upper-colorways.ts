/** Contextual garment finishes, NOT the removed global wardrobe palette.
 * Each is a documented/credible material treatment for its own silhouette.
 * Existing 30 approved camouflage masters and headwear never change.
 */
import * as THREE from 'three';
export const TOP_COLORWAYS={
 'combat-shirt':[
  ['standard','Sand knit'],['olive','Olive knit'],['ranger','Ranger green knit'],
  ['coyote','Coyote knit'],['black','Black knit']
 ],
 'smock-jacket':[
  ['standard','Classic olive'],['ranger','Ranger green'],
  ['khaki','Khaki'],['coyote','Coyote brown'],['black','Black']
 ],
 'gorka-jacket':[
  ['standard','Khaki / brown'],['olive-brown','Olive / dark brown'],
  ['sand-olive','Sand / olive'],['olive','Solid mountain olive'],
  ['ss-leto','SS-Leto summer inserts (new)'],
  ['ss-autumn','SS-Autumn inserts (new)']
 ]
} as const;
export type GarmentColorway=typeof TOP_COLORWAYS[keyof typeof TOP_COLORWAYS][number][0];
export const topColorwayChoices=(top:string):readonly (readonly [string,string])[] =>
 TOP_COLORWAYS[top as keyof typeof TOP_COLORWAYS]??[];
export const isGarmentColorway=(id:unknown):id is GarmentColorway=>
 typeof id==='string'&&Object.values(TOP_COLORWAYS).some(
  list=>list.some(([key])=>key===id));
export function resolvedTopColorway(top:string,requested:string):
 string{
 const choices=topColorwayChoices(top);
 return choices.some(([id])=>id===requested)?requested:'standard';
}
type ColorPair={base:number;panel:number};
const gorkaColors:Readonly<Record<string,ColorPair>>={
 standard:{base:0xae9872,panel:0x59483b},
 'olive-brown':{base:0x757654,panel:0x433f33},
 'sand-olive':{base:0xb6a481,panel:0x697456},
 olive:{base:0x72785d,panel:0x67704f},
 'ss-leto':{base:0xa79970,panel:0xffffff},
 'ss-autumn':{base:0x9b8a6e,panel:0xffffff}
};
const combatColors:Readonly<Record<string,number>>={
 standard:0xb7a27b,olive:0x7b8167,ranger:0x606c5c,
 coyote:0x8f7758,black:0x353c3c
};
const smockColors:Readonly<Record<string,number>>={
 standard:0x7d805f,ranger:0x657765,khaki:0xb0a07a,
 coyote:0x8f7a5b,black:0x383e3e
};
export function garmentColorValues(top:string,id:string){
 const chosen=resolvedTopColorway(top,id);
 const gorka=gorkaColors[chosen]??gorkaColors.standard;
 const specialty:'ss-leto'|'ss-autumn'|null=
  chosen==='ss-leto'||chosen==='ss-autumn'?chosen as 'ss-leto'|'ss-autumn':null;
 return {combat:combatColors[chosen]??combatColors.standard,
  smock:smockColors[chosen]??smockColors.standard,
  gorkaBase:gorka.base,gorkaPanel:gorka.panel,
  specialty};
}
/** Two original hand-authored, intentionally reusable 64px masters.
 * Oak-leaf/Partizan-style foliage, one green summer and one ochre autumn.
 * These are *art studies*, not exact copies of any manufacturer's print.
 * No procedural noise/reroll, no use on helmets or other garment families.
 */
const polygons:readonly (readonly [number,readonly (readonly [number,number])[]])[]=[
 [1,[[2,4],[12,1],[17,7],[27,8],[22,14],[29,19],[19,23],[14,17],[6,18]]],
 [2,[[27,0],[36,3],[41,10],[38,16],[49,19],[43,25],[33,21],[29,14]]],
 [3,[[51,2],[63,0],[63,17],[54,18],[46,12]]],
 [1,[[2,30],[14,23],[21,27],[16,36],[26,40],[17,47],[8,42],[0,44]]],
 [2,[[34,27],[43,27],[50,34],[58,31],[62,39],[54,44],[57,52],[43,48],[38,41],[29,39]]],
 [3,[[13,53],[24,46],[30,49],[34,60],[27,63],[9,63],[5,58]]],
 [1,[[0,51],[6,53],[6,62],[0,63]]],
 [2,[[48,54],[54,51],[64,55],[64,64],[43,64]]],
 [3,[[24,25],[28,22],[35,24],[32,30],[28,32]]],
 [2,[[11,6],[18,4],[20,8],[17,12],[11,11]]],
 [3,[[4,36],[8,33],[12,36],[10,42],[5,42]]],
 [1,[[54,16],[61,20],[60,26],[53,29],[47,26]]]
];
const specks:readonly (readonly [number,number,number])[]=[
 [11,4,1],[23,16,0],[41,7,0],[56,29,1],[4,48,0],
 [18,55,0],[31,38,1],[44,40,0],[48,58,0],[5,21,1],
 [37,15,1],[22,32,0],[60,9,1],[34,59,0]
];
const palette={
 'ss-leto':[0x8c9768,0x374b32,0x606b41,0xbaa675],
 'ss-autumn':[0xb19b73,0x6b4639,0x986a4b,0xd2b686]
} as const;
const cache=new Map<string,THREE.DataTexture>();
function contains(poly:readonly (readonly [number,number])[],x:number,y:number){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>y)!==(yj>y)&&
    x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
export function gorkaSpecialtyPixels(id:'ss-leto'|'ss-autumn'):Uint8Array{
 const rgb=palette[id],out=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  let n=0;
  for(const [key,poly] of polygons)
   if(contains(poly,x+.5,y+.5))n=key;
  for(const [sx,sy,key] of specks)
   if(Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1)n=key;
  const c=rgb[n],offset=(y*64+x)*4;
  out[offset]=(c>>16)&255;out[offset+1]=(c>>8)&255;
  out[offset+2]=c&255;out[offset+3]=255;
 }
 return out;
}
export function gorkaSpecialtyTexture(id:'ss-leto'|'ss-autumn'):
 THREE.DataTexture{
 const found=cache.get(id);if(found)return found;
 const t=new THREE.DataTexture(gorkaSpecialtyPixels(id),64,64,
  THREE.RGBAFormat,THREE.UnsignedByteType);
 t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.colorSpace=THREE.SRGBColorSpace;
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.generateMipmaps=true;
 t.repeat.set(.64,.64);
 t.name='Fieldwork Gorka-only '+id;
 t.needsUpdate=true;cache.set(id,t);return t;
}
